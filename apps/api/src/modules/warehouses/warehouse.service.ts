import { Prisma } from '@prisma/client';
import type { WarehouseIssueInput, WarehouseTransferInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

/** Ombor detail — umumiy ma'lumot + statistika */
export async function getWarehouseDetail(id: string) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          warehouseStocks: { where: { quantity: { gt: 0 } } },
          supplierTransactions: true,
        },
      },
    },
  });
  if (!warehouse) throw notFound('WAREHOUSE_NOT_FOUND', 'Ombor topilmadi');

  // Jami zaxira va qiymat
  const stockAgg = await prisma.warehouseStock.aggregate({
    where: { warehouseId: id, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });

  // Jami qiymat (costPrice * quantity) — raw query
  const valueRows = await prisma.$queryRaw<{ total: number | null }[]>`
    SELECT COALESCE(SUM(ws."quantity" * p."costPrice"), 0)::float AS total
    FROM "WarehouseStock" ws
    JOIN "Product" p ON p.id = ws."productId"
    WHERE ws."warehouseId" = ${id} AND ws."quantity" > 0 AND p."isDeleted" = false
  `;
  const totalValue = Number(valueRows[0]?.total ?? 0);

  return {
    ...warehouse,
    totalQuantity: stockAgg._sum.quantity ?? 0,
    totalValue,
  };
}

/** Omborda turgan mahsulotlar ro'yxati (pagination + search) */
export async function listWarehouseProducts(opts: {
  warehouseId: string;
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
}) {
  const { warehouseId, page, limit, search, categoryId } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.WarehouseStockWhereInput = {
    warehouseId,
    quantity: { gt: 0 },
    product: {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          ...(/^\d+$/.test(search) ? [{ code: parseInt(search, 10) }] : []),
        ],
      }),
      ...(categoryId && { categoryId }),
    },
  };

  const [stocks, total] = await Promise.all([
    prisma.warehouseStock.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            price: true,
            costPrice: true,
            stock: true,
            minStock: true,
            unit: true,
            images: true,
            category: { select: { id: true, name: true } },
            subCategory: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.warehouseStock.count({ where }),
  ]);

  return {
    data: stocks,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** Ombordagi stock harakatlari tarixi */
export async function listWarehouseMovements(opts: {
  warehouseId: string;
  page: number;
  limit: number;
  type?: 'IMPORT' | 'ISSUE_TO_SHOP' | 'TRANSFER' | 'SHOP_RETURN' | 'ADJUSTMENT';
}) {
  const { warehouseId, page, limit, type } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
    ...(type && { type }),
  };

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, code: true } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** CHIQIM: Ombor → Do'kon (mahsulotlar bo'limi) */
export async function issueToShop(
  warehouseId: string,
  input: WarehouseIssueInput,
  userId: string,
) {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw notFound('WAREHOUSE_NOT_FOUND', 'Ombor topilmadi');

  if (input.items.length === 0) throw badRequest('VALIDATION', 'Kamida 1 ta mahsulot kerak');

  // Mahsulot va omborda mavjud miqdorlarni tekshirish
  const productIds = input.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: { id: true, name: true },
    }),
    prisma.warehouseStock.findMany({
      where: { warehouseId, productId: { in: productIds } },
    }),
  ]);

  if (products.length !== productIds.length) {
    throw notFound('PRODUCT_NOT_FOUND', "Ba'zi mahsulotlar topilmadi");
  }

  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Yetarli miqdor borligini tekshirish
  for (const item of input.items) {
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      const product = productMap.get(item.productId)!;
      throw badRequest(
        'INSUFFICIENT_STOCK',
        `"${product.name}" mahsuloti omborda yetarli emas. Mavjud: ${available}, So'ralgan: ${item.quantity}`,
      );
    }
  }

  // Atomic: WarehouseStock kamaytirish + Product.stock (do'kon) oshirish + StockMovement
  const result = await prisma.$transaction(async (tx) => {
    await Promise.all(
      input.items.map(async (item) => {
        // 1. WarehouseStock kamaytirish
        await tx.warehouseStock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // 2. Product.stock (do'kon) oshirish
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }),
    );

    // 3. StockMovement yozuvlari
    await tx.stockMovement.createMany({
      data: input.items.map((item) => ({
        type: 'ISSUE_TO_SHOP' as const,
        productId: item.productId,
        quantity: item.quantity,
        fromWarehouseId: warehouseId,
        toWarehouseId: null,
        note: input.note ?? null,
        createdById: userId,
      })),
    });

    return { itemCount: input.items.length };
  });

  await createAuditLog({
    action: 'ISSUE_TO_SHOP',
    entity: 'Warehouse',
    entityId: warehouseId,
    userId,
    newData: { items: input.items, note: input.note },
  });

  return result;
}

/** KO'CHIRISH: Ombor → Boshqa ombor */
export async function transferToWarehouse(
  fromWarehouseId: string,
  input: WarehouseTransferInput,
  userId: string,
) {
  if (fromWarehouseId === input.toWarehouseId) {
    throw badRequest('VALIDATION', "O'sha omborga ko'chirib bo'lmaydi");
  }

  const [fromWarehouse, toWarehouse] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    prisma.warehouse.findUnique({ where: { id: input.toWarehouseId } }),
  ]);
  if (!fromWarehouse) throw notFound('WAREHOUSE_NOT_FOUND', 'Manba ombor topilmadi');
  if (!toWarehouse) throw notFound('WAREHOUSE_NOT_FOUND', 'Maqsad ombor topilmadi');

  const productIds = input.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: { id: true, name: true },
    }),
    prisma.warehouseStock.findMany({
      where: { warehouseId: fromWarehouseId, productId: { in: productIds } },
    }),
  ]);

  if (products.length !== productIds.length) {
    throw notFound('PRODUCT_NOT_FOUND', "Ba'zi mahsulotlar topilmadi");
  }

  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      const product = productMap.get(item.productId)!;
      throw badRequest(
        'INSUFFICIENT_STOCK',
        `"${product.name}" mahsuloti omborda yetarli emas. Mavjud: ${available}, So'ralgan: ${item.quantity}`,
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await Promise.all(
      input.items.map(async (item) => {
        // 1. Manba ombor kamaytirish
        await tx.warehouseStock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: fromWarehouseId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // 2. Maqsad ombor: upsert + increment
        await tx.warehouseStock.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: input.toWarehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: input.toWarehouseId,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        });
      }),
    );

    // 3. Movement yozuvlari
    await tx.stockMovement.createMany({
      data: input.items.map((item) => ({
        type: 'TRANSFER' as const,
        productId: item.productId,
        quantity: item.quantity,
        fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        note: input.note ?? null,
        createdById: userId,
      })),
    });

    return { itemCount: input.items.length };
  });

  await createAuditLog({
    action: 'TRANSFER',
    entity: 'Warehouse',
    entityId: fromWarehouseId,
    userId,
    newData: { toWarehouseId: input.toWarehouseId, items: input.items, note: input.note },
  });

  return result;
}
