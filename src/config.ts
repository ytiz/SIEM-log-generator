import * as dotenv from 'dotenv';

dotenv.config();

export interface GeneratorConfig {
  baseUrl: string;
  email: string;
  password: string;
  bruteForceAttempts: number;
  bruteForceIntervalMs: number;
  attemptDelayMs: number;
  noiseIntervalMs: number;
}

function getFirstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return undefined;
}

function getRequiredEnv(keys: string[], label: string): string {
  const value = getFirstDefined(keys);

  if (!value) {
    throw new Error(
      `Missing required ${label}. Expected one of: ${keys.join(', ')}`,
    );
  }

  return value;
}

function getPositiveIntEnv(keys: string[], fallback: number): number {
  const raw = getFirstDefined(keys);
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer for ${keys.join('/')}="${raw}"`);
  }

  return parsed;
}

export const CONFIG: GeneratorConfig = {
  baseUrl: getRequiredEnv(['SIEM_BASE_URL'], 'SIEM base URL').replace(/\/+$/, ''),
  email: getRequiredEnv(
    ['SIEM_EMAIL', 'SIEM_USERNAME', 'SIMULATOR_EMAIL'],
    'SIEM email',
  ),
  password: getRequiredEnv(
    ['SIEM_PASSWORD', 'SIMULATOR_PASSWORD'],
    'SIEM password',
  ),
  bruteForceAttempts: getPositiveIntEnv(['BRUTE_FORCE_ATTEMPTS'], 5),
  bruteForceIntervalMs: getPositiveIntEnv(['BRUTE_FORCE_INTERVAL_MS'], 30_000),
  attemptDelayMs: getPositiveIntEnv(['BRUTE_FORCE_ATTEMPT_DELAY_MS'], 500),
  noiseIntervalMs: getPositiveIntEnv(['NOISE_INTERVAL_MS'], 10_000),
};
