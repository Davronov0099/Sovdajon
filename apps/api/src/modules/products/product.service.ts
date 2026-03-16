import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { notFound, conflict, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import type { CreateProductInput, UpdateProductInput } from '@sardorbek/shared';

interface ListProductsQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listProducts(query: ListProductsQuery) {
  const { page, limit, search, categoryId, subCategoryId, stockStatus, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(stockStatus === 'OUT_OF_STOCK' && { stock: 0 }),
    ...(stockStatus === 'NEGATIVE' && { stock: { lt: 0 } }),
    ...(stockStatus === 'IN_STOCK' && { stock: { gt: 0 } }),
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
  const ALLOWED_SORT = ['name', 'price', 'costPrice', 'stock', 'createdAt', 'updatedAt'] as const;
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
  const [total, lowStock, outOfStock, totalValue] = await Promise.all([
    prisma.product.count({ where: { isDeleted: false } }),
    // LOW_STOCK: stock > 0 AND stock <= minStock (raw SQL — column comparison)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Product"
      WHERE stock > 0 AND stock <= "minStock" AND "isDeleted" = false
    `.then((r) => Number(r[0]?.count ?? 0)),
    prisma.product.count({ where: { isDeleted: false, stock: 0 } }),
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(price * stock), 0)::float as total FROM "Product"
      WHERE "isDeleted" = false AND stock > 0
    `.then((r) => r[0]?.total ?? 0),
  ]);

  return { total, lowStock, outOfStock, totalValue };
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

export async function createProduct(input: CreateProductInput, userId: string) {
  // Check unique constraints
  if (input.sku) {
    const existing = await prisma.product.findFirst({ where: { sku: input.sku, isDeleted: false } });
    if (existing) throw conflict('PRODUCT_SKU_EXISTS');
  }
  if (input.barcode) {
    const existing = await prisma.product.findFirst({ where: { barcode: input.barcode, isDeleted: false } });
    if (existing) throw conflict('PRODUCT_BARCODE_EXISTS');
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      price: input.price,
      costPrice: input.costPrice,
      stock: input.stock ?? 0,
      minStock: input.minStock ?? 5,
      unit: input.unit ?? 'PIECE',
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      description: input.description,
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

  // Check unique constraints if changing sku/barcode
  if (input.sku && input.sku !== existing.sku) {
    const dup = await prisma.product.findFirst({ where: { sku: input.sku, isDeleted: false, NOT: { id } } });
    if (dup) throw conflict('PRODUCT_SKU_EXISTS');
  }
  if (input.barcode && input.barcode !== existing.barcode) {
    const dup = await prisma.product.findFirst({ where: { barcode: input.barcode, isDeleted: false, NOT: { id } } });
    if (dup) throw conflict('PRODUCT_BARCODE_EXISTS');
  }

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
    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.barcode !== undefined) updateData.barcode = input.barcode;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
    if (input.stock !== undefined) updateData.stock = input.stock;
    if (input.minStock !== undefined) updateData.minStock = input.minStock;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.categoryId !== undefined) updateData.category = { connect: { id: input.categoryId } };
    if (input.subCategoryId !== undefined) updateData.subCategory = { connect: { id: input.subCategoryId } };

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

export async function softDeleteProduct(id: string, userId: string) {
  const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('PRODUCT_NOT_FOUND');

  await prisma.product.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
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
