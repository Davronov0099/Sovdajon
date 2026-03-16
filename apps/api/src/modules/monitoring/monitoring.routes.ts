import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../plugins/auth.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import os from 'os';

export async function monitoringRoutes(app: FastifyInstance): Promise<void> {
  // System metrics (Admin only)
  app.get('/metrics', { preHandler: [requireRole('ADMIN')] }, async (_request, reply) => {
    const [dbCheck, redisCheck, tableCount] = await Promise.all([
      prisma.$queryRaw<[{ now: Date }]>`SELECT NOW()`.then(() => true).catch(() => false),
      redis.ping().then(() => true).catch(() => false),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int AS count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `.then((r) => Number(r[0]?.count ?? 0)),
    ]);

    const memUsage = process.memoryUsage();

    reply.send({
      success: true,
      data: {
        system: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          uptime: Math.round(process.uptime()),
          hostname: os.hostname(),
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usedPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
          processRss: memUsage.rss,
          processHeap: memUsage.heapUsed,
        },
        cpu: {
          cores: os.cpus().length,
          loadAvg: os.loadavg(),
        },
        services: {
          database: dbCheck,
          redis: redisCheck,
          tableCount,
        },
        env: {
          nodeEnv: env.NODE_ENV,
          port: env.PORT,
        },
      },
    });
  });

  // Database stats
  app.get('/db-stats', { preHandler: [requireRole('ADMIN')] }, async (_request, reply) => {
    const [users, products, receipts, debts, customers] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.receipt.count(),
      prisma.debt.count(),
      prisma.customer.count(),
    ]);

    reply.send({
      success: true,
      data: { users, products, receipts, debts, customers },
    });
  });
}
