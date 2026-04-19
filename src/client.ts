import axios from 'axios';
import type { AxiosInstance } from 'axios'; 
import * as dotenv from 'dotenv';

dotenv.config();

export class SiemClient {
  private api: AxiosInstance;
  private token: string | null = null;

    constructor() {
    const url = process.env.SIEM_BASE_URL;
    
    if (!url) {
        throw new Error('SIEM_BASE_URL is not defined in .env file');
    }

  this.api = axios.create({
    baseURL: url, // Now TS knows this is definitely a string
  });
}

  // 1. Authenticate with your NestJS Backend
  async login(): Promise<void> {
    try {
      const response = await this.api.post('/auth/login', {
        username: process.env.SIEM_USERNAME,
        password: process.env.SIEM_PASSWORD,
      });
      
      // Adjust 'access_token' based on what your actual auth service returns
      this.token = response.data.access_token;
      console.log('✅ Authenticated: JWT secured.');
    } catch (error: any) {
      console.error('❌ Auth Failed:', error.response?.data || error.message);
      process.exit(1);
    }
  }

  // 2. Send the log to the /events/ingest endpoint
  async emitLog(payload: any) {
    if (!this.token) await this.login();

    try {
      await this.api.post('/events/ingest', payload, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      console.log(`🚀 Log Emitted: ${payload.eventType} - ${payload.severity}`);
    } catch (error: any) {
      console.error('❌ Ingestion Error:', error.response?.data || error.message);
    }
  }
}