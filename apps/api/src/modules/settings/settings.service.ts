import { prisma } from '../../config/database.js';
import { createAuditLog } from '../../utils/auditLog.js';

export async function getAllSettings() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function updateSetting(key: string, value: string, userId: string) {
  const existing = await prisma.setting.findUnique({ where: { key } });
  const oldValue = existing?.value;

  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, type: 'string' },
  });

  await createAuditLog({
    action: 'SETTINGS_UPDATE',
    entity: 'Setting',
    entityId: key,
    userId,
    oldData: oldValue ? { value: oldValue } : undefined,
    newData: { value },
  });

  return setting;
}

export async function updateCurrencyRate(rate: number, userId: string) {
  return updateSetting('currencyRate', String(rate), userId);
}

export async function getCurrencyRate(): Promise<number> {
  const value = await getSetting('currencyRate');
  return value ? Number(value) : 12800;
}
