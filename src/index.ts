import { SiemClient } from './client.js';
import { CONFIG } from './config.js';
import { SCENARIOS } from './scenarios.js';
import type { ISiemEvent } from './types.js';

console.log('Environment Debug:', { url: CONFIG.baseUrl, email: CONFIG.email });

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

  await runBruteForceScenario();
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

void start();