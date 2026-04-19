import { SiemClient } from './client.js';

const client = new SiemClient();

const run = async () => {
  // Initial Handshake
  await client.login();

  // Simple loop to send a log every 5 seconds
  setInterval(async () => {
    const mockLog = {
      timestamp: new Date().toISOString(),
      eventType: 'system_heartbeat',
      source: 'standalone-generator-v1',
      severity: 'low', // Matches your 'low' | 'medium' | 'high' | 'critical'
      message: 'Generator service is active and monitoring.',
      payload: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed,
      }
    };

    await client.emitLog(mockLog);
  }, 5000);
};

void run();