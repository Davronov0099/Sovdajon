import { Prisma } from '@prisma/client';
import type { CreateReceiptInput } from '@sardorbek/shared';
import { calculateAutoDiscount, calculateDiscount } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { badRequest, notFound, forbidden } from '../../utils/errors.js';
// Stock decrement is done inline in the transaction for atomicity
import { createAuditLog } from '../../utils/auditLog.js';
import { emitToAll, emitToAdmins } from '../../websocket/index.js';

interface ListReceiptsQuery {
  page: number;
  limit: number;
  search?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  isDraft?: boolean;
  createdById?: string;
}

export async function createReceipt(input: CreateReceiptInput, userId: string) {
  const { items, paymentMethod, customerId, cashReceived, mixedPayments, discountPercent, debtDueDays } = input;

  // Validate items and fetch product data
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false },
    select: { id: true, name: true, price: true, costPrice: true, stock: true, minStock: true },
  });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw notFound('PRODUCT_NOT_FOUND', `Products not found: ${missing.join(', ')}`);
  }

  // Debt requires customer
  if (paymentMethod === 'DEBT' && !customerId) {
    throw badRequest('RECEIPT_DEBT_NO_CUSTOMER');
  }

  // Check customer debt limit for DEBT payments
  if (paymentMethod === 'DEBT' && customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
      select: { debtLimit: true },
    });

    if (customer?.debtLimit) {
      const existingDebt = await prisma.debt.aggregate({
        where: { customerId, status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] } },
        _sum: { remainingAmount: true },
      });
      const currentDebt = Number(existingDebt._sum.remainingAmount ?? 0);

      // Calculate new receipt total to check limit
      const productMap = new Map(products.map((p) => [p.id, p]));
      let estimatedTotal = 0;
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        estimatedTotal += Number(product.price) * item.quantity;
      }

      if (currentDebt + estimatedTotal > Number(customer.debtLimit)) {
        throw badRequest('DEBT_LIMIT_EXCEEDED');
      }
    }
  }

  // Build receipt items with calculations
  const productMap = new Map(products.map((p) => [p.id, p]));
  const receiptItems: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    costPrice: Prisma.Decimal;
    discount: number;
    total: Prisma.Decimal;
  }[] = [];

  let subtotal = 0;
  const stockDecrements: { productId: string; quantity: number }[] = [];

  // Qarzga sotganda chegirma bo'lmaydi
  const isDebtPayment = paymentMethod === 'DEBT';

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.price);
    const costPrice = Number(product.costPrice);

    // Auto-discount based on quantity (qarz bo'lsa 0)
    const autoDiscount = isDebtPayment ? 0 : calculateAutoDiscount(item.quantity);
    const itemDiscount = isDebtPayment ? 0 : Math.max(item.discount ?? 0, autoDiscount);

    const lineSubtotal = unitPrice * item.quantity;
    const lineDiscount = calculateDiscount(lineSubtotal, itemDiscount);
    const lineTotal = lineSubtotal - lineDiscount;

    receiptItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(unitPrice),
      costPrice: new Prisma.Decimal(costPrice),
      discount: itemDiscount,
      total: new Prisma.Decimal(lineTotal),
    });

    subtotal += lineTotal;
    stockDecrements.push({ productId: item.productId, quantity: item.quantity });
  }

  // Apply receipt-level discount (qarz bo'lsa 0)
  const receiptDiscount = isDebtPayment ? 0 : calculateDiscount(subtotal, discountPercent ?? 0);
  const total = subtotal - receiptDiscount;

  // Validate mixed payment sum
  if (paymentMethod === 'MIXED' && mixedPayments) {
    const mixedSum = mixedPayments.reduce((sum, mp) => sum + mp.amount, 0);
    if (Math.abs(mixedSum - total) > 100) {
      throw badRequest('RECEIPT_MIXED_SUM_MISMATCH');
    }
  }

  // Calculate change for cash
  const change = paymentMethod === 'CASH' && cashReceived
    ? cashReceived - total
    : null;

  // Atomic transaction: create receipt + decrement stock
  const receipt = await prisma.$transaction(async (tx) => {
    // 1. Atomic stock decrement
    for (const dec of stockDecrements) {
      await tx.product.update({
        where: { id: dec.productId },
        data: { stock: { decrement: dec.quantity } },
      });
    }

    // 2. Create receipt with items
    const created = await tx.receipt.create({
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(receiptDiscount),
        discountPercent: new Prisma.Decimal(discountPercent ?? 0),
        total: new Prisma.Decimal(total),
        paymentMethod,
        cashReceived: cashReceived != null ? new Prisma.Decimal(cashReceived) : null,
        change: change != null ? new Prisma.Decimal(change) : null,
        mixedPayments: mixedPayments ? JSON.parse(JSON.stringify(mixedPayments)) : undefined,
        customerId: customerId ?? null,
        createdById: userId,
        isDraft: false,
        items: {
          create: receiptItems,
        },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // 3. Create debt record if DEBT payment
    if (paymentMethod === 'DEBT' && customerId) {
      await tx.debt.create({
        data: {
          customerId,
          receiptId: created.id,
          amount: new Prisma.Decimal(total),
          remainingAmount: new Prisma.Decimal(total),
          status: 'ACTIVE',
          dueDate: new Date(Date.now() + (debtDueDays || 30) * 24 * 60 * 60 * 1000),
          createdById: userId,
        },
      });
    }

    return created;
  });

  // Audit log
  await createAuditLog({
    action: 'SALE',
    entity: 'Receipt',
    entityId: receipt.id,
    userId,
    newData: {
      total: Number(total),
      paymentMethod,
      itemCount: receiptItems.length,
    },
  });

  // WebSocket events
  try {
    emitToAll('receipt:created', {
      id: receipt.id,
      number: receipt.number,
      total: Number(receipt.total),
      paymentMethod: receipt.paymentMethod,
      createdBy: receipt.createdBy.name,
    });

    // Emit stock updates for each product
    for (const dec of stockDecrements) {
      const product = productMap.get(dec.productId)!;
      const newStock = product.stock - dec.quantity;
      emitToAll('product:updated', {
        id: dec.productId,
        stock: newStock,
      });
    }
  } catch {
    // WebSocket errors should not break the sale
  }

  return receipt;
}

export async function getReceipt(id: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, images: true, unit: true } },
        },
      },
      customer: { select: { id: true, name: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      returns: {
        include: { items: true },
      },
    },
  });

  if (!receipt) throw notFound('RECEIPT_NOT_FOUND');
  return receipt;
}

export async function listReceipts(query: ListReceiptsQuery) {
  const { page, limit, search, paymentMethod, startDate, endDate, isDraft, createdById } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReceiptWhereInput = {
    ...(paymentMethod && { paymentMethod: paymentMethod as Prisma.EnumPaymentMethodFilter }),
    ...(isDraft !== undefined && { isDraft }),
    ...(createdById && { createdById }),
    ...(startDate && endDate && {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
    ...(search && {
      OR: [
        { number: { equals: parseInt(search) || -1 } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { id: true, productId: true, productName: true, quantity: true, unitPrice: true, costPrice: true, discount: true, total: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.receipt.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function saveDraft(input: CreateReceiptInput, userId: string, source: string = 'POS') {
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false },
    select: { id: true, name: true, price: true, costPrice: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const receiptItems = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw notFound('PRODUCT_NOT_FOUND');
    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * item.quantity;
    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(unitPrice),
      costPrice: new Prisma.Decimal(Number(product.costPrice)),
      discount: item.discount ?? 0,
      total: new Prisma.Decimal(lineTotal),
    };
  });

  const subtotal = receiptItems.reduce((sum, i) => sum + Number(i.total), 0);

  // Get next draft number
  const draftCount = await prisma.receipt.count({ where: { isDraft: true } });

  return prisma.receipt.create({
    data: {
      number: draftCount + 1,
      subtotal: new Prisma.Decimal(subtotal),
      discount: new Prisma.Decimal(0),
      discountPercent: new Prisma.Decimal(0),
      total: new Prisma.Decimal(subtotal),
      paymentMethod: input.paymentMethod,
      customerId: input.customerId ?? null,
      createdById: userId,
      isDraft: true,
      source,
      items: { create: receiptItems },
    },
    include: {
      items: true,
      customer: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function listHelperCarts() {
  return prisma.receipt.findMany({
    where: { isDraft: true, source: 'HELPER' },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { select: { id: true, productId: true, productName: true, quantity: true, unitPrice: true, costPrice: true, discount: true, total: true } },
      customer: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteDraft(id: string, userId: string, userRole: string) {
  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) throw notFound('RECEIPT_NOT_FOUND');
  if (!receipt.isDraft) throw badRequest('RECEIPT_NOT_FOUND', 'Cannot delete finalized receipt');
  if (userRole !== 'ADMIN' && receipt.createdById !== userId) {
    throw forbidden('AUTH_FORBIDDEN');
  }

  await prisma.receipt.delete({ where: { id } });

  // Renumber remaining drafts sequentially starting from 1
  const remainingDrafts = await prisma.receipt.findMany({
    where: { isDraft: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  await Promise.all(
    remainingDrafts.map((draft, idx) =>
      prisma.receipt.update({ where: { id: draft.id }, data: { number: idx + 1 } }),
    ),
  );
}

export async function deleteReceipt(id: string, userId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!receipt) throw notFound('RECEIPT_NOT_FOUND');

  // Restore stock
  await prisma.$transaction(async (tx) => {
    for (const item of receipt.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Delete related debts
    await tx.debt.deleteMany({ where: { receiptId: id } });

    // Delete receipt (cascades to items)
    await tx.receipt.delete({ where: { id } });
  });

  await createAuditLog({
    action: 'DELETE',
    entity: 'Receipt',
    entityId: id,
    userId,
  });
}

export async function offlineSync(
  offlineReceipts: (CreateReceiptInput & { offlineId: string })[],
  userId: string,
) {
  const results: { offlineId: string; receiptId?: string; status: 'synced' | 'conflict' | 'error'; error?: string }[] = [];

  for (const offlineReceipt of offlineReceipts) {
    // Dedup check
    const existing = await prisma.receipt.findFirst({
      where: { id: offlineReceipt.offlineId },
    });

    if (existing) {
      results.push({ offlineId: offlineReceipt.offlineId, receiptId: existing.id, status: 'synced' });
      continue;
    }

    try {
      const receipt = await createReceipt(offlineReceipt, userId);
      results.push({ offlineId: offlineReceipt.offlineId, receiptId: receipt.id, status: 'synced' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('DEBT_LIMIT') ? 'conflict' : 'error';
      results.push({ offlineId: offlineReceipt.offlineId, status, error: message });
    }
  }

  // Notify admin about conflicts
  const conflicts = results.filter((r) => r.status === 'conflict');
  if (conflicts.length > 0) {
    try {
      emitToAdmins('offline:conflicts', { userId, conflicts });
    } catch { /* ignore */ }
  }

  return results;
}
