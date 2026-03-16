import cron from 'node-cron';
import pino from 'pino';
import { markOverdueDebts } from '../modules/debts/debt.service.js';
import { redis } from '../config/redis.js';
import { emitToAdmins } from '../websocket/index.js';

const log = pino({ name: 'cron:overdue' });

const LOCK_KEY = 'cron:overdue-debts';
const LOCK_TTL = 120; // 2x expected duration for safety

/**
 * Overdue debt cron — har kuni 09:00 da
 * PM2 cluster mode uchun Redis lock — faqat bitta instance ishlaydi
 */
export function startOverdueCron(): void {
  cron.schedule('0 9 * * *', async () => {
    // Acquire lock (PM2 cluster safe — NX = set only if not exists)
    const acquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX');
    if (!acquired) {
      log.debug('Lock already held by another instance — skipping');
      return;
    }

    try {
      const count = await markOverdueDebts();
      if (count > 0) {
        log.info({ count }, `Marked ${count} debts as OVERDUE`);

        // WebSocket notification to admins
        try {
          emitToAdmins('debt:overdue-alert', {
            count,
            message: `${count} ta qarz muddati o'tdi`,
            timestamp: new Date().toISOString(),
          });
        } catch {
          log.warn('Failed to emit overdue alert via WebSocket');
        }
      } else {
        log.debug('No overdue debts found');
      }
    } catch (error) {
      log.error(error, 'Overdue check failed');
    } finally {
      // Release lock early if finished before TTL
      await redis.del(LOCK_KEY).catch(() => {});
    }
  });

  log.info('Overdue debt checker scheduled at 09:00 daily');
}
