import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

interface ListCustomersQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
}

export async function listCustomers(query: ListCustomersQuery) {
  const { page, limit, search, categoryId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        debtLimit: true,
        loyaltyPoints: true,
        note: true,
        startDate: true,
        categoryId: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        _count: {
          select: {
            debts: { where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] } } },
            receipts: { where: { isDraft: false } },
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function searchCustomers(search: string, limit = 10) {
  return prisma.customer.findMany({
    where: {
      isDeleted: false,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    },
    take: limit,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      debtLimit: true,
      loyaltyPoints: true,
      category: { select: { id: true, name: true } },
    },
  });
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
    include: {
      debts: {
        orderBy: { createdAt: 'desc' },
        include: {
          payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
      receipts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          items: true,
        },
      },
    },
  });

  if (!customer) throw notFound('CUSTOMER_NOT_FOUND');
  return customer;
}

interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  debtLimit?: number;
  note?: string;
  startDate?: string;
  categoryId?: string | null;
}

export async function createCustomer(input: CreateCustomerInput, userId: string) {
  // Check phone uniqueness
  const existing = await prisma.customer.findFirst({
    where: { phone: input.phone, isDeleted: false },
  });
  if (existing) throw badRequest('CUSTOMER_PHONE_EXISTS');

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      address: input.address,
      debtLimit: input.debtLimit != null ? new Prisma.Decimal(input.debtLimit) : null,
      note: input.note,
      startDate: input.startDate ? new Date(input.startDate) : null,
      categoryId: input.categoryId ?? null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      debtLimit: true,
      loyaltyPoints: true,
      startDate: true,
      categoryId: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Customer',
    entityId: customer.id,
    userId,
    newData: { name: input.name, phone: input.phone },
  });

  return customer;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput>, userId: string) {
  const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('CUSTOMER_NOT_FOUND');

  if (input.phone && input.phone !== existing.phone) {
    const duplicate = await prisma.customer.findFirst({
      where: { phone: input.phone, isDeleted: false, id: { not: id } },
    });
    if (duplicate) throw badRequest('CUSTOMER_PHONE_EXISTS');
  }

  const data: Prisma.CustomerUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.debtLimit !== undefined) data.debtLimit = input.debtLimit != null ? new Prisma.Decimal(input.debtLimit) : null;
  if (input.note !== undefined) data.note = input.note;
  if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.categoryId !== undefined) data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };

  const customer = await prisma.customer.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      debtLimit: true,
      loyaltyPoints: true,
      note: true,
      startDate: true,
      categoryId: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Customer',
    entityId: id,
    userId,
    oldData: { name: existing.name, phone: existing.phone },
    newData: { name: input.name ?? existing.name, phone: input.phone ?? existing.phone },
  });

  return customer;
}

export async function softDeleteCustomer(id: string, userId: string) {
  const customer = await prisma.customer.findFirst({ where: { id, isDeleted: false } });
  if (!customer) throw notFound('CUSTOMER_NOT_FOUND');

  // Check active debts
  const activeDebts = await prisma.debt.count({
    where: { customerId: id, status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] } },
  });
  if (activeDebts > 0) throw badRequest('CUSTOMER_HAS_ACTIVE_DEBTS');

  await prisma.customer.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await createAuditLog({
    action: 'SOFT_DELETE',
    entity: 'Customer',
    entityId: id,
    userId,
  });
}
