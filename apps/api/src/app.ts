import { join } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { errorPlugin } from './plugins/error.js';
import { authPlugin } from './plugins/auth.js';
import { rateLimitPlugin } from './plugins/rateLimit.js';
import { requestLogPlugin } from './plugins/requestLog.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { productRoutes } from './modules/products/product.routes.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { uploadRoutes } from './uploads/upload.handler.js';
import { receiptRoutes } from './modules/receipts/receipt.routes.js';
import { customerRoutes } from './modules/customers/customer.routes.js';
import { returnRoutes } from './modules/returns/return.routes.js';
import { debtRoutes } from './modules/debts/debt.routes.js';
import { supplierRoutes } from './modules/suppliers/supplier.routes.js';
import { expenseRoutes } from './modules/expenses/expense.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { salaryRoutes } from './modules/salary/salary.routes.js';
import { advanceRoutes } from './modules/advance/advance.routes.js';
import { kpiRoutes } from './modules/kpi/kpi.routes.js';
import { fineRoutes } from './modules/fine/fine.routes.js';
import { cashierSessionRoutes } from './modules/cashier-session/session.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { warehouseRoutes } from './modules/warehouses/warehouse.routes.js';
import { partnerRoutes } from './modules/partners/partner.routes.js';
import { contactRoutes } from './modules/contacts/contact.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { monitoringRoutes } from './modules/monitoring/monitoring.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow cross-origin images
  });

  // CORS
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  // Cookies (for refresh token)
  await app.register(cookie);

  // Rate limiting
  await app.register(rateLimitPlugin);

  // Error handling
  await app.register(errorPlugin);

  // Request logging (requestId, duration)
  await app.register(requestLogPlugin);

  // Auth decorator
  await app.register(authPlugin);

  // Health check (no auth)
  app.get('/api/v1/health/live', async () => ({ status: 'ok' }));

  app.get('/api/v1/health/ready', async () => {
    // Check DB and Redis
    const { prisma } = await import('./config/database.js');
    const { redis } = await import('./config/redis.js');

    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();

    return { status: 'ok', db: 'connected', redis: 'connected' };
  });

  app.get('/api/v1/health/startup', async (_request, reply) => {
    try {
      const { prisma } = await import('./config/database.js');
      const tables = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const tableCount = Number(tables[0]?.count ?? 0);
      if (tableCount < 5) {
        return reply.status(503).send({ status: 'not_ready', tables: tableCount, message: 'Migrations not applied' });
      }
      return { status: 'ok', tables: tableCount };
    } catch {
      return reply.status(503).send({ status: 'not_ready', message: 'Database not available' });
    }
  });

  // Static files — uploads
  const fastifyStatic = await import('@fastify/static');
  const uploadRoot = join(process.cwd(), env.UPLOAD_DIR);
  const { existsSync, mkdirSync } = await import('fs');
  if (!existsSync(uploadRoot)) mkdirSync(uploadRoot, { recursive: true });
  await app.register(fastifyStatic.default, {
    root: uploadRoot,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // API routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(productRoutes, { prefix: '/api/v1/products' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(uploadRoutes, { prefix: '/api/v1/upload' });
  await app.register(receiptRoutes, { prefix: '/api/v1/receipts' });
  await app.register(customerRoutes, { prefix: '/api/v1/customers' });
  await app.register(returnRoutes, { prefix: '/api/v1/returns' });
  await app.register(debtRoutes, { prefix: '/api/v1/debts' });
  await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' });
  await app.register(expenseRoutes, { prefix: '/api/v1/expenses' });
  await app.register(settingsRoutes, { prefix: '/api/v1/settings' });
  await app.register(attendanceRoutes, { prefix: '/api/v1/attendance' });
  await app.register(salaryRoutes, { prefix: '/api/v1/salary' });
  await app.register(advanceRoutes, { prefix: '/api/v1/advances' });
  await app.register(kpiRoutes, { prefix: '/api/v1/kpi' });
  await app.register(fineRoutes, { prefix: '/api/v1/fines' });
  await app.register(cashierSessionRoutes, { prefix: '/api/v1/cashier-sessions' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(warehouseRoutes, { prefix: '/api/v1/warehouses' });
  await app.register(partnerRoutes, { prefix: '/api/v1/partners' });
  await app.register(contactRoutes, { prefix: '/api/v1/contacts' });
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  await app.register(monitoringRoutes, { prefix: '/api/v1/monitoring' });

  return app;
}
