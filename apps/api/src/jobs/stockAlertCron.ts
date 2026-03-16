import cron from 'node-cron';
import pino from 'pino';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { notifyLowStock } from '../modules/telegram/telegram.service.js';

const log = pino({ name: 'cron:stock-alert' });
const LOCK_KEY = 'cron:stock-alert';
const LOCK_TTL = 120;

// Daily at 08:00 — notify low stock products
export function startStockAlertCron(): void {
  cron.schedule('0 8 * * *', async () => {
    const acquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX');
    if (!acquired) return;

    try {
      const lowStock = await prisma.product.findMany({
        where: {
          isDeleted: false,
          stock: { lte: prisma.product.fields?.minStock ?? 5 },
        },
        select: { name: true, stock: true, minStock: true },
        orderBy: { stock: 'asc' },
        take: 50,
      });

      // Filter: stock <= minStock (Prisma can't compare columns, do it in JS)
      const alerts = lowStock.filter((p) => p.stock <= p.minStock);

      if (alerts.length > 0) {
        log.info({ count: alerts.length }, 'Low stock products found');
        await notifyLowStock(alerts);
      }
    } catch (error) {
      log.error(error, 'Stock alert check failed');
    } finally {
      await redis.del(LOCK_KEY).catch(() => {});
    }
  });

  log.info('Stock alert checker scheduled at 08:00 daily');
}
