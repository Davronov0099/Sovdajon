import type { Prisma } from '@prisma/client';
import pino from 'pino';
import { prisma } from '../config/database.js';

const log = pino({ name: 'audit' });

export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'BULK_UPDATE' | 'DELETE'
  | 'SOFT_DELETE' | 'RESTORE' | 'SALE' | 'RETURN'
  | 'DEBT_CREATE' | 'DEBT_PAY' | 'DEBT_EXTEND'
  | 'SALARY_CALCULATE' | 'SALARY_PAY' | 'SALARY_RECALCULATE'
  | 'PRICE_CHANGE' | 'STOCK_CHANGE' | 'SETTINGS_UPDATE'
  | 'USER_ACTIVATE' | 'USER_DEACTIVATE' | 'BACKUP';

interface AuditLogParams {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        userId: params.userId,
        oldData: params.oldData as Prisma.InputJsonValue | undefined,
        newData: params.newData as Prisma.InputJsonValue | undefined,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    // AuditLog should never break the main flow
    log.error(error, 'AuditLog write failed');
  }
}
