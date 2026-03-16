import { createServer } from 'http';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { setupSocketIO } from './websocket/index.js';
import { startOverdueCron } from './jobs/overdueCron.js';
import { startStockAlertCron } from './jobs/stockAlertCron.js';
import { startBackupCron } from './jobs/backupCron.js';

async function start(): Promise<void> {
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

    // Stop accepting new connections
    httpServer.close();

    // Close app (finishes in-flight requests with kill_timeout: 15s)
    await app.close();

    // Disconnect services
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
