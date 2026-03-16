import { Prisma } from '@prisma/client';
import type { CreateAdvanceInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

interface AdvanceListQuery {
  status?: string;
  userId?: string;
  page: number;
  limit: number;
}

export async function listAdvances(query: AdvanceListQuery) {
  const { status, userId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AdvanceWhereInput = {
    ...(status && { status: status as Prisma.EnumAdvanceStatusFilter }),
    ...(userId && { userId }),
  };

  const [data, total] = await Promise.all([
    prisma.advance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.advance.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function createAdvance(input: CreateAdvanceInput, creatorId: string) {
  const user = await prisma.user.findFirst({ where: { id: input.userId, isActive: true } });
  if (!user) throw notFound('USER_NOT_FOUND');

  const advance = await prisma.advance.create({
    data: {
      userId: input.userId,
      amount: new Prisma.Decimal(input.amount),
      reason: input.reason ?? null,
      status: 'PENDING',
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Advance',
    entityId: advance.id,
    userId: creatorId,
    newData: { amount: input.amount, userId: input.userId },
  });

  return advance;
}

export async function approveAdvance(id: string, adminId: string) {
  const advance = await prisma.advance.findUnique({ where: { id } });
  if (!advance) throw notFound('NOT_FOUND', 'Avans topilmadi');
  if (advance.status !== 'PENDING') throw badRequest('VALIDATION_ERROR', 'Faqat PENDING statusli avansni tasdiqlash mumkin');

  const updated = await prisma.advance.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: adminId },
    include: { user: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Advance',
    entityId: id,
    userId: adminId,
    newData: { status: 'APPROVED' },
  });

  return updated;
}

export async function rejectAdvance(id: string, adminId: string) {
  const advance = await prisma.advance.findUnique({ where: { id } });
  if (!advance) throw notFound('NOT_FOUND', 'Avans topilmadi');
  if (advance.status !== 'PENDING') throw badRequest('VALIDATION_ERROR', 'Faqat PENDING statusli avansni rad etish mumkin');

  const updated = await prisma.advance.update({
    where: { id },
    data: { status: 'REJECTED', approvedById: adminId },
    include: { user: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Advance',
    entityId: id,
    userId: adminId,
    newData: { status: 'REJECTED' },
  });

  return updated;
}
