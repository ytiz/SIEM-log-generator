import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';

import type { GeneratorConfig } from './config.js';
import type { ISiemEvent } from './types.js';

export class SiemClient {
  private api: AxiosInstance;
  private token: string | null = null;
  private loginInFlight: Promise<void> | null = null;

  constructor(private readonly config: GeneratorConfig) {
    this.api = axios.create({
      baseURL: config.baseUrl,
      timeout: 10_000,
    });
  }

  private async authenticate(): Promise<void> {
    const response = await this.api.post<{ accessToken?: string; access_token?: string }>(
      '/auth/login',
      {
        email: this.config.email,
        password: this.config.password,
      },
    );

    const accessToken = response.data.accessToken ?? response.data.access_token;
    if (!accessToken) {
      throw new Error('Auth response does not include accessToken');
    }

    this.token = accessToken;
    console.log('Authenticated');
  }

  async login(force = false): Promise<void> {
    if (force) {
      this.token = null;
    }

    if (this.token) return;

    if (!this.loginInFlight) {
      this.loginInFlight = this.authenticate().finally(() => {
        this.loginInFlight = null;
      });
    }

    try {
      await this.loginInFlight;
    } catch (error: unknown) {
      const detail = this.formatError(error);
      throw new Error(`Authentication failed: ${detail}`);
    }
  }

  async emitLog(payload: ISiemEvent): Promise<void> {
    await this.login();

    try {
      await this.api.post('/events/ingest', payload, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      console.log(`Log Emitted: ${payload.eventType} - ${payload.severity ?? 'n/a'}`);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // Retry once after re-auth if token has expired.
      if (axiosError.response?.status === 401) {
        try {
          await this.login(true);
          await this.api.post('/events/ingest', payload, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
          console.log(`Log Emitted: ${payload.eventType} - ${payload.severity ?? 'n/a'}`);
          return;
        } catch (retryError: unknown) {
          console.error('Ingestion Error after re-auth:', this.formatError(retryError));
          return;
        }
      }

      console.error('Ingestion Error:', this.formatError(error));
    }
  }

  async ingestCloudTrail(events: Record<string, unknown>[]): Promise<{ ingested: number; errors: number }> {
    const response = await this.api.post<{ ingested?: number; errors?: number }>(
      '/aws/ingest/cloudtrail',
      events,
      { headers: { 'x-user-role': 'admin' } },
    );
    return {
      ingested: response.data.ingested ?? events.length,
      errors:   response.data.errors   ?? 0,
    };
  }

  private formatError(error: unknown): string {
    if (!axios.isAxiosError(error)) {
      return error instanceof Error ? error.message : String(error);
    }

    const data = error.response?.data;
    if (!data) {
      return error.message;
    }

    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data);
    } catch {
      return error.message;
    }
  }
}