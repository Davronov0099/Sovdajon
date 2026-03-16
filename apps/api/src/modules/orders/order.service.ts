import { Prisma } from '@prisma/client';
import type { CreateOrderInput, UpdateOrderStatusInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

// Valid status transitions (forward only, or CANCELLED from any)
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

interface OrderListQuery {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export async function listOrders(query: OrderListQuery) {
  const { page, limit, status, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status: status as Prisma.EnumOrderStatusFilter }),
  };

  if (search) {
    const conditions: Prisma.OrderWhereInput[] = [
      { note: { contains: search, mode: 'insensitive' as const } },
    ];
    if (!isNaN(Number(search))) {
      conditions.push({ number: Number(search) });
    }
    where.OR = conditions;
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, images: true } } },
      },
    },
  });
  if (!order) throw notFound('NOT_FOUND', 'Buyurtma topilmadi');
  return order;
}

export async function createOrder(input: CreateOrderInput, userId: string) {
  // Calculate total from items
  let total = 0;
  const itemsData = input.items.map((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    total += itemTotal;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      total: new Prisma.Decimal(itemTotal),
    };
  });

  const order = await prisma.order.create({
    data: {
      customerId: input.customerId ?? null,
      total: new Prisma.Decimal(total),
      note: input.note ?? null,
      createdById: userId,
      items: { create: itemsData },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Order',
    entityId: order.id,
    userId,
    newData: { total, itemCount: input.items.length },
  });

  return order;
}

export async function updateOrderStatus(id: string, input: UpdateOrderStatusInput, userId: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('NOT_FOUND', 'Buyurtma topilmadi');

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(input.status)) {
    throw badRequest('VALIDATION_ERROR', `${order.status} dan ${input.status} ga o'tish mumkin emas`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: input.status },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Order',
    entityId: id,
    userId,
    oldData: { status: order.status },
    newData: { status: input.status },
  });

  return updated;
}

export async function deleteOrder(id: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('NOT_FOUND', 'Buyurtma topilmadi');

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.delete({ where: { id } }),
  ]);

  await createAuditLog({
    action: 'DELETE',
    entity: 'Order',
    entityId: id,
    userId,
  });
}
