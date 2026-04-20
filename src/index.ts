import { SiemClient } from './client.js';
import { CONFIG } from './config.js';
import { SCENARIOS } from './scenarios.js';
import { buildAnalyticsBatch } from './cloudtrail.js';
import type { ISiemEvent } from './types.js';

const STARTUP_DEBUG = process.env.STARTUP_DEBUG === 'true';

if (STARTUP_DEBUG) {
  console.log('Environment Debug:', { url: CONFIG.baseUrl });
}

const client = new SiemClient(CONFIG);
const intervals: ReturnType<typeof setInterval>[] = [];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const withTimestamp = (event: ISiemEvent): ISiemEvent => ({
  ...event,
  timestamp: new Date().toISOString(),
});

async function runBruteForceScenario(): Promise<void> {
  const attackerIp = '45.33.22.11';
  const username = 'root';

  console.log('--- Starting Brute Force Scenario ---');

  for (let i = 0; i < CONFIG.bruteForceAttempts; i++) {
    await client.emitLog(withTimestamp(SCENARIOS.BRUTE_FORCE(attackerIp, username)));
    await sleep(CONFIG.attemptDelayMs);
  }

  await client.emitLog({
    ...withTimestamp(SCENARIOS.SUCCESSFUL_LOGIN(attackerIp, username)),
    severity: 'high',
    message: `ALERT: Successful login for ${username} AFTER multiple failures.`,
  });
}

async function seedAnalytics(): Promise<void> {
  if (CONFIG.skipAnalyticsSeed) {
    console.log('Analytics seed skipped (SKIP_ANALYTICS_SEED=true).');
    return;
  }

  console.log(`--- Seeding ${CONFIG.analyticsEvents} AWS CloudTrail analytics events ---`);
  const pools = buildAnalyticsBatch(CONFIG.analyticsEvents);
  let totalOk = 0, totalFail = 0;

  for (const { name, batches } of pools) {
    let ok = 0, fail = 0;

    for (const batch of batches) {
      try {
        const result = await client.ingestCloudTrail(batch);
        ok   += result.ingested;
        fail += result.errors;
      } catch (error: unknown) {
        fail += batch.length;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ${name} batch error: ${message}`);
      }
    }

    console.log(`  ${name.padEnd(12)} ${ok} ingested, ${fail} failed`);
    totalOk   += ok;
    totalFail += fail;
  }

  console.log(`--- Analytics seed complete: ${totalOk} stored, ${totalFail} failed ---`);
}

async function emitSystemNoise(): Promise<void> {
  await client.emitLog({
    eventType: 'system_health',
    severity: 'low',
    message: 'System check: all services operational',
    source: 'generator-node-01',
    timestamp: new Date().toISOString(),
  });
}

function registerSignalHandlers(): void {
  const shutdown = (signal: string) => {
    for (const timer of intervals) {
      clearInterval(timer);
    }

    console.log(`Received ${signal}. Generator stopped.`);
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

const start = async () => {
  try {
    await client.login();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Startup failed: ${message}`);
    process.exitCode = 1;
    return;
  }

  registerSignalHandlers();

  await seedAnalytics();

  let bruteForceRunning = false;

  const bruteForceTimer = setInterval(async () => {
    if (bruteForceRunning) {
      return;
    }

    bruteForceRunning = true;
    try {
      await runBruteForceScenario();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Brute-force scenario failed: ${message}`);
    } finally {
      bruteForceRunning = false;
    }
  }, CONFIG.bruteForceIntervalMs);

  const noiseTimer = setInterval(() => {
    void emitSystemNoise();
  }, CONFIG.noiseIntervalMs);

  intervals.push(bruteForceTimer, noiseTimer);

  if (!bruteForceRunning) {
    bruteForceRunning = true;
    try {
      await runBruteForceScenario();
    } finally {
      bruteForceRunning = false;
    }
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

void start();