import cron from 'node-cron';
import pino from 'pino';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { notifyBackupStatus } from '../modules/telegram/telegram.service.js';

const execAsync = promisify(exec);
const log = pino({ name: 'cron:backup' });

const LOCK_KEY = 'cron:backup';
const LOCK_TTL = 600; // 10 minutes
const RETENTION_DAYS = 30;

/**
 * Database backup cron — daily at 02:00
 * PM2 cluster safe via Redis lock
 */
export function startBackupCron(): void {
  cron.schedule('0 2 * * *', async () => {
    const acquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX');
    if (!acquired) {
      log.debug('Backup lock held by another instance');
      return;
    }

    const backupDir = env.BACKUP_DIR;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sardorbek-db-${timestamp}.sql.gz`;
    const filepath = join(backupDir, filename);

    try {
      // Ensure backup dir exists
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      // pg_dump with gzip compression
      const dbUrl = env.DATABASE_URL;
      const cmd = `pg_dump "${dbUrl}" | gzip > "${filepath}"`;

      log.info({ filepath }, 'Starting database backup');
      await execAsync(cmd, { timeout: 300_000 }); // 5 min timeout

      // Verify file created and has content
      const stat = statSync(filepath);
      if (stat.size < 100) {
        throw new Error(`Backup file too small: ${stat.size} bytes`);
      }

      log.info({ filepath, size: stat.size }, 'Backup completed successfully');
      await notifyBackupStatus(true, `${filename} (${Math.round(stat.size / 1024)}KB)`);

      // Cleanup old backups (keep last RETENTION_DAYS)
      cleanupOldBackups(backupDir);

    } catch (error) {
      log.error(error, 'Database backup failed');
      await notifyBackupStatus(false, (error as Error).message);
    } finally {
      await redis.del(LOCK_KEY).catch(() => {});
    }
  });

  log.info('Database backup scheduled at 02:00 daily');
}

function cleanupOldBackups(dir: string): void {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql.gz'))
      .map((f) => ({ name: f, path: join(dir, f), mtime: statSync(join(dir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    let removed = 0;
    for (const file of files) {
      if (file.mtime < cutoff) {
        unlinkSync(file.path);
        removed++;
      }
    }

    if (removed > 0) {
      log.info({ removed }, 'Old backups cleaned up');
    }
  } catch (error) {
    log.warn(error, 'Backup cleanup failed');
  }
}
