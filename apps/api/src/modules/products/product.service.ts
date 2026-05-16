import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import type { CreateProductInput, UpdateProductInput, BulkUpdateProductsInput } from '@sardorbek/shared';

interface ListProductsQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  warehouseId?: string;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE';
  priceStatus?: 'WITH_PRICE' | 'NO_PRICE';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listProducts(query: ListProductsQuery) {
  const { page, limit, search, categoryId, subCategoryId, warehouseId, stockStatus, priceStatus, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    // warehouseId — WarehouseStock orqali: shu omborda quantity > 0 bo'lgan mahsulotlar
    ...(warehouseId && {
      warehouseStocks: {
        some: { warehouseId, quantity: { gt: 0 } },
      },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        ...(/^\d+$/.test(search) ? [{ code: parseInt(search, 10) }] : []),
      ],
    }),
    ...(stockStatus === 'OUT_OF_STOCK' && { stock: 0 }),
    ...(stockStatus === 'NEGATIVE' && { stock: { lt: 0 } }),
    ...(stockStatus === 'IN_STOCK' && { stock: { gt: 0 } }),
    ...(priceStatus === 'NO_PRICE' && { price: { lte: 0 } }),
    ...(priceStatus === 'WITH_PRICE' && { price: { gt: 0 } }),
  };

  // LOW_STOCK: stock > 0 AND stock <= minStock (column-to-column — raw SQL kerak)
  let lowStockIds: string[] | null = null;
  if (stockStatus === 'LOW_STOCK') {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE stock > 0 AND stock <= "minStock" AND "isDeleted" = false
    `;
    lowStockIds = rows.map((r) => r.id);
    where.id = { in: lowStockIds };
  }

  // Whitelist — faqat ruxsat etilgan fieldlar bo'yicha sort
  const ALLOWED_SORT = ['name', 'code', 'price', 'costPrice', 'stock', 'createdAt', 'updatedAt'] as const;
  type AllowedSort = (typeof ALLOWED_SORT)[number];

  const orderBy: Prisma.ProductOrderByWithRelationInput = {};
  if (sortBy && (ALLOWED_SORT as readonly string[]).includes(sortBy)) {
    orderBy[sortBy as AllowedSort] = sortOrder ?? 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductStats() {
  const [total, lowStock, outOfStock, noPrice, totalValue] = await Promise.all([
    prisma.product.count({ where: { isDeleted: false } }),
    // LOW_STOCK: stock > 0 AND stock <= minStock (raw SQL — column comparison)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Product"
      WHERE stock > 0 AND stock <= "minStock" AND "isDeleted" = false
    `.then((r) => Number(r[0]?.count ?? 0)),
    prisma.product.count({ where: { isDeleted: false, stock: 0 } }),
    prisma.product.count({ where: { isDeleted: false, price: { lte: 0 } } }),
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(price * stock), 0)::float as total FROM "Product"
      WHERE "isDeleted" = false AND stock > 0
    `.then((r) => r[0]?.total ?? 0),
  ]);

  return { total, lowStock, outOfStock, noPrice, totalValue };
}

/** Kam qolgan + tugagan mahsulotlar ro'yxati (do'kon stock bo'yicha) */
export async function getLowStockProducts(limit = 100) {
  // stock <= minStock AND isDeleted=false — column comparison kerak, raw SQL
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product"
    WHERE "isDeleted" = false AND stock <= "minStock"
    ORDER BY stock ASC, name ASC
    LIMIT ${limit}
  `;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  return prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      code: true,
      name: true,
      stock: true,
      minStock: true,
      unit: true,
      price: true,
      images: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  });
}

export async function getProductByCode(code: number) {
  const product = await prisma.product.findFirst({
    where: { code, isDeleted: false },
    include: {
      category: { select: { id: true, name: true } },
      subCategory: { select: { id: true, name: true } },
    },
  });
  if (!product) throw notFound('PRODUCT_NOT_FOUND', `Code: ${code}`);
  return product;
}

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: {
      category: { select: { id: true, name: true } },
      subCategory: { select: { id: true, name: true } },
      priceHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product) throw notFound('PRODUCT_NOT_FOUND');
  return product;
}

// Eng kichik bo'sh kodni topish (1, 2, 3... — o'chirilgan kodlar qayta ishlatiladi)
async function getNextAvailableCode(): Promise<number> {
  // Hozirda ishlatilayotgan barcha kodlarni olish (faqat code != null)
  const rows = await prisma.$queryRaw<{ code: number }[]>`
    SELECT code FROM "Product" WHERE code IS NOT NULL ORDER BY code
  `;
  const usedCodes = new Set(rows.map((r) => r.code));

  // Eng kichik bo'sh kodni topish: 1 dan boshlab
  for (let i = 1; ; i++) {
    if (!usedCodes.has(i)) return i;
  }
}

export async function createProduct(input: CreateProductInput, userId: string) {
  const code = await getNextAvailableCode();

  const product = await prisma.product.create({
    data: {
      name: input.name,
      price: input.price,
      costPrice: input.costPrice,
      stock: input.stock ?? 0,
      minStock: input.minStock ?? 5,
      unit: input.unit ?? 'PIECE',
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      description: input.description,
      images: input.images ?? [],
      code,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    userId,
    newData: { name: input.name, price: input.price, costPrice: input.costPrice },
  });

  return product;
}

export async function updateProduct(id: string, input: UpdateProductInput, userId: string) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('PRODUCT_NOT_FOUND');

  // Price change → auto log to PriceHistory
  const priceChanged =
    (input.price !== undefined && Number(input.price) !== Number(existing.price)) ||
    (input.costPrice !== undefined && Number(input.costPrice) !== Number(existing.costPrice));

  const product = await prisma.$transaction(async (tx) => {
    if (priceChanged) {
      await tx.priceHistory.create({
        data: {
          productId: id,
          oldPrice: existing.price,
          newPrice: input.price ?? existing.price,
          oldCostPrice: existing.costPrice,
          newCostPrice: input.costPrice ?? existing.costPrice,
          reason: 'MANUAL',
          createdById: userId,
        },
      });
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
    if (input.stock !== undefined) updateData.stock = input.stock;
    if (input.minStock !== undefined) updateData.minStock = input.minStock;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.images !== undefined) updateData.images = input.images;
    if (input.categoryId !== undefined) updateData.category = { connect: { id: input.categoryId } };
    if (input.subCategoryId !== undefined) updateData.subCategory = { connect: { id: input.subCategoryId } };
    if (input.isMarketplaceVisible !== undefined) updateData.isMarketplaceVisible = input.isMarketplaceVisible;
    if (input.showPrice !== undefined) updateData.showPrice = input.showPrice;

    return tx.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Product',
    entityId: id,
    userId,
    oldData: { name: existing.name, price: Number(existing.price) },
    newData: input as Record<string, unknown>,
  });

  return product;
}

export async function bulkUpdateProducts(input: BulkUpdateProductsInput, userId: string) {
  const { ids, data } = input;

  const existing = await prisma.product.findMany({
    where: { id: { in: ids }, isDeleted: false },
    select: { id: true, name: true, price: true, costPrice: true },
  });
  if (existing.length === 0) throw notFound('PRODUCT_NOT_FOUND');

  const foundIds = new Set(existing.map((p) => p.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  // Fields go directly into Product update; categoryId/subCategoryId need relation connect
  const { categoryId, subCategoryId, ...rest } = data as Record<string, unknown>;
  const updateData: Prisma.ProductUpdateManyMutationInput = { ...(rest as Prisma.ProductUpdateManyMutationInput) };

  await prisma.$transaction(async (tx) => {
    // Update scalar fields in bulk
    if (Object.keys(updateData).length > 0 || categoryId !== undefined || subCategoryId !== undefined) {
      await tx.product.updateMany({
        where: { id: { in: existing.map((p) => p.id) } },
        data: {
          ...updateData,
          ...(categoryId !== undefined && { categoryId: categoryId as string }),
          ...(subCategoryId !== undefined && { subCategoryId: (subCategoryId as string) || null }),
        },
      });
    }

    // Price-history entries — bir necha bo'lsa ham har biri uchun alohida
    const priceChanged = data.price !== undefined || data.costPrice !== undefined;
    if (priceChanged) {
      for (const p of existing) {
        await tx.priceHistory.create({
          data: {
            productId: p.id,
            oldPrice: p.price,
            newPrice: data.price ?? p.price,
            oldCostPrice: p.costPrice,
            newCostPrice: data.costPrice ?? p.costPrice,
            reason: 'BULK_UPDATE',
            createdById: userId,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: 'BULK_UPDATE',
    entity: 'Product',
    entityId: existing.map((p) => p.id).join(','),
    userId,
    newData: { count: existing.length, fields: Object.keys(data) },
  });

  return { updated: existing.length, missingIds };
}

export async function softDeleteProduct(id: string, userId: string) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('PRODUCT_NOT_FOUND');

  await prisma.product.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), code: null },
  });

  await createAuditLog({
    action: 'SOFT_DELETE',
    entity: 'Product',
    entityId: id,
    userId,
    oldData: { name: existing.name },
  });
}

export async function updateProductImages(id: string, images: string[]) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('PRODUCT_NOT_FOUND');

  if (images.length > 8) {
    throw badRequest('UPLOAD_MAX_IMAGES', 'Maximum 8 images allowed');
  }

  return prisma.product.update({
    where: { id },
    data: { images },
  });
}
