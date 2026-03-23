import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { emitToAdmins, emitToCashiers } from '../../websocket/index.js';

interface CreateOrderInput {
  customerId?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  note?: string;
  createdById: string;
}

interface ListOrdersQuery {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, images: true, unit: true } },
    },
  },
  customer: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

export async function createOrder(input: CreateOrderInput) {
  const { customerId, items, note, createdById } = input;

  if (!items.length) {
    throw badRequest('ORDER_EMPTY_ITEMS');
  }

  // Validate products exist
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false },
    select: { id: true, name: true },
  });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw notFound('PRODUCT_NOT_FOUND', `Products not found: ${missing.join(', ')}`);
  }

  // Validate customer if provided
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
      select: { id: true },
    });
    if (!customer) throw notFound('CUSTOMER_NOT_FOUND');
  }

  // Build order items and calculate total
  const orderItems = items.map((item) => {
    const lineTotal = item.unitPrice * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      total: new Prisma.Decimal(lineTotal),
    };
  });

  const total = orderItems.reduce((sum, i) => sum + Number(i.total), 0);

  const order = await prisma.order.create({
    data: {
      customerId: customerId ?? null,
      total: new Prisma.Decimal(total),
      note: note ?? null,
      createdById,
      status: 'PENDING',
      items: { create: orderItems },
    },
    include: orderInclude,
  });

  // WebSocket: notify admins
  try {
    emitToAdmins('order:created', {
      id: order.id,
      number: order.number,
      total: Number(order.total),
      status: order.status,
      createdBy: order.createdBy.name,
    });
  } catch { /* WebSocket errors should not break the order */ }

  return order;
}

export async function listOrders(query: ListOrdersQuery) {
  const { page, limit, status, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status: status as Prisma.EnumOrderStatusFilter }),
    ...(search && {
      OR: [
        { number: { equals: parseInt(search) || -1 } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
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
    include: orderInclude,
  });

  if (!order) throw notFound('ORDER_NOT_FOUND');
  return order;
}

export async function updateOrderStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw notFound('ORDER_NOT_FOUND');

  // Only PENDING orders can transition to CONFIRMED or CANCELLED
  if (order.status !== 'PENDING' && (status === 'CONFIRMED' || status === 'CANCELLED')) {
    throw badRequest('ORDER_NOT_PENDING');
  }

  // Validate allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (!allowedTransitions[order.status]?.includes(status)) {
    throw badRequest('ORDER_INVALID_STATUS', `Cannot transition from ${order.status} to ${status}`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: orderInclude,
  });

  // WebSocket events
  try {
    if (status === 'CONFIRMED') {
      emitToCashiers('order:confirmed', {
        id: updated.id,
        number: updated.number,
        total: Number(updated.total),
        status: updated.status,
        customer: updated.customer,
      });
    }

    emitToAdmins('order:statusChanged', {
      id: updated.id,
      number: updated.number,
      status: updated.status,
      previousStatus: order.status,
    });
  } catch { /* ignore */ }

  return updated;
}

export async function deleteOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw notFound('ORDER_NOT_FOUND');
  if (order.status !== 'PENDING') {
    throw badRequest('ORDER_NOT_PENDING', 'Only PENDING orders can be deleted');
  }

  await prisma.order.delete({ where: { id } });
}
