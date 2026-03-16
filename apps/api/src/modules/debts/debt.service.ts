import { Prisma } from '@prisma/client';
import type { CreateDebtInput, DebtPaymentInput, DebtExtendInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { emitToAdmins, emitToAll } from '../../websocket/index.js';

interface DebtListQuery {
  page: number;
  limit: number;
  status?: string;
  customerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function listDebts(query: DebtListQuery) {
  const { page, limit, status, customerId, search, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.DebtWhereInput = {
    ...(status && { status: status as Prisma.EnumDebtStatusFilter }),
    ...(customerId && { customerId }),
    ...(startDate && endDate && {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
    ...(search && {
      customer: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      },
    }),
  };

  const [data, total, stats] = await Promise.all([
    prisma.debt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 3, include: { createdBy: { select: { id: true, name: true } } } },
        _count: { select: { payments: true, extensions: true } },
      },
    }),
    prisma.debt.count({ where }),
    prisma.debt.groupBy({
      by: ['status'],
      _sum: { remainingAmount: true },
      _count: true,
    }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    stats,
  };
}

export async function getDebt(id: string) {
  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, debtLimit: true } },
      receipt: {
        select: { id: true, number: true, total: true, createdAt: true },
      },
      createdBy: { select: { id: true, name: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      extensions: {
        orderBy: { createdAt: 'desc' },
        include: { approvedBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!debt) throw notFound('DEBT_NOT_FOUND');
  return debt;
}

export async function createDebt(input: CreateDebtInput, userId: string) {
  // Check customer exists
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, isDeleted: false },
    select: { id: true, name: true, debtLimit: true },
  });
  if (!customer) throw notFound('CUSTOMER_NOT_FOUND');

  // Check debt limit
  if (customer.debtLimit) {
    const existingDebt = await prisma.debt.aggregate({
      where: {
        customerId: input.customerId,
        status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { remainingAmount: true },
    });
    const currentDebt = Number(existingDebt._sum.remainingAmount ?? 0);
    if (currentDebt + input.amount > Number(customer.debtLimit)) {
      throw badRequest('DEBT_LIMIT_EXCEEDED');
    }
  }

  const debt = await prisma.debt.create({
    data: {
      customerId: input.customerId,
      receiptId: input.receiptId ?? null,
      amount: new Prisma.Decimal(input.amount),
      remainingAmount: new Prisma.Decimal(input.amount),
      status: 'ACTIVE',
      dueDate: new Date(input.dueDate),
      note: input.note ?? null,
      createdById: userId,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  await createAuditLog({
    action: 'DEBT_CREATE',
    entity: 'Debt',
    entityId: debt.id,
    userId,
    newData: { amount: input.amount, customerId: input.customerId },
  });

  try {
    emitToAdmins('debt:created', {
      id: debt.id,
      amount: Number(debt.amount),
      customerName: debt.customer.name,
    });
  } catch { /* ignore */ }

  return debt;
}

export async function makePayment(debtId: string, input: DebtPaymentInput, userId: string) {
  const debt = await prisma.debt.findUnique({ where: { id: debtId } });
  if (!debt) throw notFound('DEBT_NOT_FOUND');
  if (debt.status === 'PAID') throw badRequest('DEBT_ALREADY_PAID');

  const remaining = Number(debt.remainingAmount);
  if (input.amount > remaining) {
    throw badRequest('DEBT_OVERPAYMENT');
  }

  const newRemaining = remaining - input.amount;
  const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIAL';

  const result = await prisma.$transaction(async (tx) => {
    // Create payment record
    const payment = await tx.debtPayment.create({
      data: {
        debtId,
        amount: new Prisma.Decimal(input.amount),
        method: input.method,
        note: input.note ?? null,
        createdById: userId,
      },
    });

    // Update debt
    const updatedDebt = await tx.debt.update({
      where: { id: debtId },
      data: {
        remainingAmount: new Prisma.Decimal(newRemaining),
        status: newStatus,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return { payment, debt: updatedDebt };
  });

  await createAuditLog({
    action: 'DEBT_PAY',
    entity: 'Debt',
    entityId: debtId,
    userId,
    newData: { amount: input.amount, method: input.method, newRemaining, newStatus },
  });

  try {
    emitToAll('debt:payment', {
      debtId,
      amount: input.amount,
      remaining: newRemaining,
      status: newStatus,
    });
  } catch { /* ignore */ }

  return result;
}

export async function extendDebt(debtId: string, input: DebtExtendInput, userId: string) {
  const debt = await prisma.debt.findUnique({ where: { id: debtId } });
  if (!debt) throw notFound('DEBT_NOT_FOUND');
  if (debt.status === 'PAID') throw badRequest('DEBT_ALREADY_PAID');

  const result = await prisma.$transaction(async (tx) => {
    // Log extension
    await tx.debtExtension.create({
      data: {
        debtId,
        oldDate: debt.dueDate,
        newDate: new Date(input.newDate),
        reason: input.reason,
        approvedById: userId,
      },
    });

    // Update due date
    return tx.debt.update({
      where: { id: debtId },
      data: { dueDate: new Date(input.newDate) },
      include: { customer: { select: { id: true, name: true } } },
    });
  });

  await createAuditLog({
    action: 'DEBT_EXTEND',
    entity: 'Debt',
    entityId: debtId,
    userId,
    newData: { oldDate: debt.dueDate, newDate: input.newDate, reason: input.reason },
  });

  return result;
}

export async function getDebtStats() {
  // Parallel queries for aggregates
  const [totals, overdue, topDebtorsRaw] = await Promise.all([
    prisma.debt.aggregate({
      _sum: { amount: true, remainingAmount: true },
      _count: true,
    }),
    prisma.debt.count({
      where: { status: 'OVERDUE' },
    }),
    // Single query with JOIN — no N+1
    prisma.$queryRaw<
      { customerId: string; customerName: string; customerPhone: string; remaining: number }[]
    >`
      SELECT d."customerId", c.name AS "customerName", c.phone AS "customerPhone",
             SUM(d."remainingAmount")::float AS remaining
      FROM "Debt" d
      JOIN "Customer" c ON c.id = d."customerId"
      WHERE d.status IN ('ACTIVE', 'PARTIAL', 'OVERDUE')
      GROUP BY d."customerId", c.name, c.phone
      ORDER BY remaining DESC
      LIMIT 10
    `,
  ]);

  return {
    totalAmount: Number(totals._sum.amount ?? 0),
    totalRemaining: Number(totals._sum.remainingAmount ?? 0),
    totalCount: totals._count,
    overdueCount: overdue,
    topDebtors: topDebtorsRaw.map((d) => ({
      customer: { id: d.customerId, name: d.customerName, phone: d.customerPhone },
      remaining: d.remaining,
    })),
  };
}

// Cron: mark overdue debts (Toshkent UTC+5 vaqtida)
export async function markOverdueDebts() {
  // Server vaqtini ishlatamiz — PM2 da TZ=Asia/Tashkent sozlangan
  const now = new Date();
  const result = await prisma.debt.updateMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['ACTIVE', 'PARTIAL'] },
    },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}
