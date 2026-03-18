import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// dotenv ni barcha import'lardan OLDIN yuklash kerak
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

async function start(): Promise<void> {
  // Dynamic import — dotenv yuklangandan keyin
  const { createServer } = await import('http');
  const { buildApp } = await import('./app.js');
  const { env } = await import('./config/env.js');
  const { connectDatabase, disconnectDatabase } = await import('./config/database.js');
  const { connectRedis, disconnectRedis } = await import('./config/redis.js');
  const { setupSocketIO } = await import('./websocket/index.js');
  const { startOverdueCron } = await import('./jobs/overdueCron.js');
  const { startStockAlertCron } = await import('./jobs/stockAlertCron.js');
  const { startBackupCron } = await import('./jobs/backupCron.js');

  const app = await buildApp();

  // Connect to services
  await connectDatabase();
  app.log.info('Database connected');

  try {
    await connectRedis();
    app.log.info('Redis connected');
  } catch (error) {
    app.log.warn('Redis not available — running without cache/blacklist');
  }

  // Create HTTP server for Socket.IO
  const httpServer = createServer(app.server);
  setupSocketIO(httpServer);
  app.log.info('Socket.IO initialized');

  // Start cron jobs
  startOverdueCron();
  startStockAlertCron();
  startBackupCron();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal} — shutting down gracefully...`);
    httpServer.close();
    await app.close();
    await disconnectDatabase();
    await disconnectRedis();
    app.log.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start listening
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server running on http://${env.HOST}:${env.PORT}`);
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
