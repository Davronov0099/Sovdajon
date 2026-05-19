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
    select: { id: true, name: true, costPrice: true, price: true, stock: true },
  });
  if (products.length !== productIds.length) throw notFound('PRODUCT_NOT_FOUND');
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate total (faqat UZS — barcha qiymatlar so'mda keladi)
  let total = 0;
  const transactionItems = input.items.map((item) => {
    const itemTotal = item.unitPrice * item.quantity;
    total += itemTotal;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      total: new Prisma.Decimal(itemTotal),
    };
  });

  // Atomic transaction: kirim mahsulotlar bo'limiga (Product.stock) to'g'ridan-to'g'ri
  const alerts: { productName: string; oldPrice: number; newPrice: number; changePercent: number }[] = [];
  const paidAtImport = Math.min(Math.max(input.paidAmount ?? 0, 0), total);

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Create supplier transaction
    const created = await tx.supplierTransaction.create({
      data: {
        supplierId,
        type: 'IMPORT',
        total: new Prisma.Decimal(total),
        paidAmount: new Prisma.Decimal(paidAtImport),
        currency: 'UZS',
        rate: new Prisma.Decimal(1),
        note: input.note ?? null,
        createdById: userId,
        items: { create: transactionItems },
      },
      include: { items: true },
    });

    const priceHistoryData: {
      productId: string;
      oldPrice: Prisma.Decimal;
      newPrice: Prisma.Decimal;
      oldCostPrice: Prisma.Decimal;
      newCostPrice: Prisma.Decimal;
      reason: string;
      createdById: string;
    }[] = [];

    // 2. Har bir mahsulot uchun: Product.stock'ni oshirish + costPrice/sellingPrice yangilash
    await Promise.all(
      input.items.map(async (item) => {
        const product = productMap.get(item.productId)!;
        const newCostPrice = item.unitPrice;
        const oldCostPrice = Number(product.costPrice);
        const newSellingPrice = item.sellingPrice;
        const newMinSellingPrice = item.minSellingPrice;
        const newWholesalePrice = item.wholesalePrice;

        // Mahsulotlar bo'limiga to'g'ridan-to'g'ri kirim (avvalgi xulq)
        const updateData: Prisma.ProductUpdateInput = {
          stock: { increment: item.quantity },
          costPrice: new Prisma.Decimal(newCostPrice),
        };
        if (newSellingPrice != null && newSellingPrice > 0) {
          updateData.price = new Prisma.Decimal(newSellingPrice);
        }
        if (newMinSellingPrice != null && newMinSellingPrice > 0) {
          updateData.minSellingPrice = new Prisma.Decimal(newMinSellingPrice);
        }
        if (newWholesalePrice != null && newWholesalePrice > 0) {
          updateData.wholesalePrice = new Prisma.Decimal(newWholesalePrice);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: updateData,
        });

        // Price history
        priceHistoryData.push({
          productId: item.productId,
          oldPrice: product.price,
          newPrice: newSellingPrice != null && newSellingPrice > 0 ? new Prisma.Decimal(newSellingPrice) : product.price,
          oldCostPrice: product.costPrice,
          newCostPrice: new Prisma.Decimal(newCostPrice),
          reason: 'SUPPLIER_IMPORT',
          createdById: userId,
        });

        // 20% alert
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

    if (priceHistoryData.length > 0) {
      await tx.priceHistory.createMany({ data: priceHistoryData });
    }

    // 3. Naqd to'lov (agar bo'lsa) — alohida PAYMENT transaksiyasi + xarajat
    const paid = paidAtImport;
    if (paid > 0) {
      await tx.supplierTransaction.create({
        data: {
          supplierId,
          type: 'PAYMENT',
          total: new Prisma.Decimal(paid),
          currency: 'UZS',
          rate: new Prisma.Decimal(1),
          note: `Kirim uchun naqd to'lov (#${created.id.slice(0, 8)})`,
          createdById: userId,
        },
      });

      // Faqat NAQD to'langan qism xarajatlarga tushadi (qarz qismi tushmaydi —
      // u keyin to'langanda makePayment orqali qo'shiladi)
      await tx.expense.create({
        data: {
          category: 'OTHER',
          type: 'SUPPLIER_IMPORT',
          amount: new Prisma.Decimal(paid),
          description: `Ta'minotchi kirimi (naqd): ${supplier.name}`,
          createdById: userId,
        },
      });
    }

    // 4. Supplier balansi — faqat qarz qismi (total - naqd)
    const debtAmount = total - paid;
    if (debtAmount !== 0) {
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { increment: new Prisma.Decimal(debtAmount) } },
      });
    }

    return created;
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'SupplierTransaction',
    entityId: transaction.id,
    userId,
    newData: { total, itemCount: input.items.length },
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

    // Qarz to'langanda — endi shu summa xarajatlarga tushadi
    await tx.expense.create({
      data: {
        category: 'OTHER',
        type: 'SUPPLIER_DEBT_PAYMENT',
        amount: new Prisma.Decimal(input.amount),
        description: `Ta'minotchi qarzi to'lovi: ${supplier.name}`,
        createdById: userId,
      },
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

/**
 * Agregat statistika — barcha IMPORT transaksiyalari bo'yicha.
 * paidAmount asosida: cash (paid=total), debt (paid=0), mixed (0<paid<total)
 */
export async function getImportStats() {
  const rows = await prisma.supplierTransaction.findMany({
    where: { type: 'IMPORT' },
    select: { total: true, paidAmount: true },
  });

  let totalCount = 0, cashCount = 0, debtCount = 0, mixedCount = 0;
  let totalSum = 0, cashSum = 0, debtSum = 0, mixedSum = 0;
  let paidSum = 0, debtPortionSum = 0;

  for (const r of rows) {
    const t = Number(r.total);
    const p = Number(r.paidAmount);
    totalCount += 1;
    totalSum += t;
    paidSum += p;
    debtPortionSum += t - p;
    if (p === 0) { debtCount += 1; debtSum += t; }
    else if (p >= t) { cashCount += 1; cashSum += t; }
    else { mixedCount += 1; mixedSum += t; }
  }

  const totalDebt = await prisma.supplier.aggregate({
    where: { isDeleted: false },
    _sum: { balance: true },
  });

  return {
    total: { count: totalCount, sum: totalSum },
    cash: { count: cashCount, sum: cashSum },
    debt: { count: debtCount, sum: debtSum },
    mixed: { count: mixedCount, sum: mixedSum },
    paidSum,            // Naqd to'langan jami (cash + mixed.paid)
    debtPortionSum,     // Qarz qismi jami (debt.sum + mixed.unpaid)
    outstandingDebt: Number(totalDebt._sum.balance ?? 0),
  };
}

/**
 * Imports ro'yxati — filter: all | cash | debt | mixed
 */
export async function listImports(filter: 'all' | 'cash' | 'debt' | 'mixed', page: number, limit: number) {
  const skip = (page - 1) * limit;
  const rows = await prisma.supplierTransaction.findMany({
    where: { type: 'IMPORT' },
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      _count: { select: { items: true } },
    },
  });

  // Filter by paidAmount semantics
  const filtered = rows.filter((r) => {
    const t = Number(r.total);
    const p = Number(r.paidAmount);
    if (filter === 'cash') return p >= t;
    if (filter === 'debt') return p === 0;
    if (filter === 'mixed') return p > 0 && p < t;
    return true;
  });

  const total = filtered.length;
  const data = filtered.slice(skip, skip + limit).map((r) => ({
    id: r.id,
    supplierId: r.supplierId,
    supplierName: r.supplier.name,
    supplierPhone: r.supplier.phone,
    total: r.total,
    paidAmount: r.paidAmount,
    debtAmount: Number(r.total) - Number(r.paidAmount),
    itemCount: r._count.items,
    note: r.note,
    createdAt: r.createdAt,
  }));

  return { data, total, page, limit };
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
