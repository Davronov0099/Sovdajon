import { Prisma } from '@prisma/client';
import type { CreateSupplierInput, SupplierImportInput, SupplierPaymentInput } from '@sardorbek/shared';
import { isCostPriceAlertNeeded } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { emitToAdmins } from '../../websocket/index.js';

export async function listSuppliers(query: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierWhereInput = {
    isDeleted: false,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { transactions: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, isDeleted: false },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!supplier) throw notFound('SUPPLIER_NOT_FOUND');
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput, userId: string) {
  const supplier = await prisma.supplier.create({
    data: {
      name: input.name,
      phone: input.phone,
      company: input.company,
      address: input.address,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Supplier',
    entityId: supplier.id,
    userId,
    newData: { name: input.name },
  });

  return supplier;
}

export async function updateSupplier(id: string, input: Partial<CreateSupplierInput>, userId: string) {
  const existing = await prisma.supplier.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('SUPPLIER_NOT_FOUND');

  const data: Prisma.SupplierUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.company !== undefined) data.company = input.company;
  if (input.address !== undefined) data.address = input.address;

  const supplier = await prisma.supplier.update({ where: { id }, data });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Supplier',
    entityId: id,
    userId,
  });

  return supplier;
}

export async function createImport(supplierId: string, input: SupplierImportInput, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, isDeleted: false } });
  if (!supplier) throw notFound('SUPPLIER_NOT_FOUND');

  // Validate products exist
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false },
    select: { id: true, name: true, costPrice: true, stock: true },
  });
  if (products.length !== productIds.length) throw notFound('PRODUCT_NOT_FOUND');
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate total
  const rate = input.currency === 'USD' ? input.rate : 1;
  let total = 0;
  const transactionItems = input.items.map((item) => {
    const itemTotal = item.unitPrice * item.quantity * rate;
    total += itemTotal;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice * rate),
      total: new Prisma.Decimal(itemTotal),
    };
  });

  // Atomic transaction: create import + update stock + update costPrice
  const alerts: { productName: string; oldPrice: number; newPrice: number; changePercent: number }[] = [];

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Create supplier transaction
    const created = await tx.supplierTransaction.create({
      data: {
        supplierId,
        type: 'IMPORT',
        total: new Prisma.Decimal(total),
        currency: input.currency,
        rate: new Prisma.Decimal(rate),
        note: input.note ?? null,
        createdById: userId,
        items: { create: transactionItems },
      },
      include: { items: true },
    });

    // 2. Batch update stock + costPrice (parallel updates instead of sequential)
    const priceHistoryData: {
      productId: string;
      oldPrice: Prisma.Decimal;
      newPrice: Prisma.Decimal;
      oldCostPrice: Prisma.Decimal;
      newCostPrice: Prisma.Decimal;
      reason: string;
      createdById: string;
    }[] = [];

    await Promise.all(
      input.items.map(async (item) => {
        const product = productMap.get(item.productId)!;
        const newCostPrice = item.unitPrice * rate;
        const oldCostPrice = Number(product.costPrice);

        // Stock increment + costPrice update (atomic per product)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: new Prisma.Decimal(newCostPrice),
          },
        });

        // Collect price history for batch insert
        priceHistoryData.push({
          productId: item.productId,
          oldPrice: product.costPrice,
          newPrice: product.costPrice,
          oldCostPrice: product.costPrice,
          newCostPrice: new Prisma.Decimal(newCostPrice),
          reason: 'SUPPLIER_IMPORT',
          createdById: userId,
        });

        // Check 20% alert
        if (isCostPriceAlertNeeded(oldCostPrice, newCostPrice)) {
          const changePercent = Math.round(((newCostPrice - oldCostPrice) / oldCostPrice) * 100);
          alerts.push({
            productName: product.name,
            oldPrice: oldCostPrice,
            newPrice: newCostPrice,
            changePercent,
          });
        }
      }),
    );

    // Batch insert price history (1 query instead of N)
    if (priceHistoryData.length > 0) {
      await tx.priceHistory.createMany({ data: priceHistoryData });
    }

    // 3. Update supplier balance (debt)
    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { increment: new Prisma.Decimal(total) } },
    });

    return created;
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'SupplierTransaction',
    entityId: transaction.id,
    userId,
    newData: { total, itemCount: input.items.length, currency: input.currency },
  });

  // Send price alerts
  if (alerts.length > 0) {
    try {
      emitToAdmins('supplier:price-alert', { supplierId, supplierName: supplier.name, alerts });
    } catch { /* ignore */ }
  }

  return { transaction, alerts };
}

export async function makePayment(supplierId: string, input: SupplierPaymentInput, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, isDeleted: false } });
  if (!supplier) throw notFound('SUPPLIER_NOT_FOUND');

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.supplierTransaction.create({
      data: {
        supplierId,
        type: 'PAYMENT',
        total: new Prisma.Decimal(input.amount),
        note: input.note ?? null,
        createdById: userId,
      },
    });

    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: new Prisma.Decimal(input.amount) } },
    });

    return transaction;
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'SupplierPayment',
    entityId: result.id,
    userId,
    newData: { amount: input.amount, supplierId },
  });

  return result;
}

export async function softDeleteSupplier(id: string, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, isDeleted: false } });
  if (!supplier) throw notFound('SUPPLIER_NOT_FOUND');

  await prisma.supplier.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await createAuditLog({
    action: 'SOFT_DELETE',
    entity: 'Supplier',
    entityId: id,
    userId,
  });
}
