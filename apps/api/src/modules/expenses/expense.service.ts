import { Prisma } from '@prisma/client';
import type { CreateExpenseInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

interface ExpenseListQuery {
  page: number;
  limit: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export async function listExpenses(query: ExpenseListQuery) {
  const { page, limit, category, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = {
    ...(category && { category }),
    ...(startDate && endDate && {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getExpenseStats(startDate?: string, endDate?: string) {
  const where: Prisma.ExpenseWhereInput = {
    ...(startDate && endDate && {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [total, byCategory] = await Promise.all([
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  return {
    totalAmount: Number(total._sum.amount ?? 0),
    totalCount: total._count,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      amount: Number(c._sum.amount ?? 0),
      count: c._count,
    })),
  };
}

export async function createExpense(input: CreateExpenseInput, userId: string) {
  const expense = await prisma.expense.create({
    data: {
      category: input.category,
      amount: new Prisma.Decimal(input.amount),
      description: input.description,
      date: input.date ? new Date(input.date) : new Date(),
      createdById: userId,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Expense',
    entityId: expense.id,
    userId,
    newData: { category: input.category, amount: input.amount },
  });

  return expense;
}

export async function updateExpense(id: string, input: Partial<CreateExpenseInput>, userId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND', 'Xarajat topilmadi');

  const data: Prisma.ExpenseUpdateInput = {};
  if (input.category !== undefined) data.category = input.category;
  if (input.amount !== undefined) data.amount = new Prisma.Decimal(input.amount);
  if (input.description !== undefined) data.description = input.description;
  if (input.date !== undefined) data.date = new Date(input.date);

  const expense = await prisma.expense.update({ where: { id }, data });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Expense',
    entityId: id,
    userId,
  });

  return expense;
}

export async function deleteExpense(id: string, userId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND', 'Xarajat topilmadi');

  await prisma.expense.delete({ where: { id } });

  await createAuditLog({
    action: 'DELETE',
    entity: 'Expense',
    entityId: id,
    userId,
  });
}
