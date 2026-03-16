import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import type { CreateCategoryInput, CreateSubCategoryInput } from '@sardorbek/shared';

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      subCategories: { orderBy: { order: 'asc' } },
      _count: { select: { products: { where: { isDeleted: false } } } },
    },
  });
}

export async function createCategory(input: CreateCategoryInput, userId: string) {
  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
  const category = await prisma.category.create({
    data: {
      name: input.name,
      icon: input.icon,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'Category',
    entityId: category.id,
    userId,
    newData: { name: input.name },
  });

  return category;
}

export async function updateCategory(id: string, input: CreateCategoryInput, userId: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('CATEGORY_NOT_FOUND');

  const category = await prisma.category.update({
    where: { id },
    data: { name: input.name, icon: input.icon },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Category',
    entityId: id,
    userId,
    oldData: { name: existing.name },
    newData: { name: input.name },
  });

  return category;
}

export async function deleteCategory(id: string, userId: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: { where: { isDeleted: false } } } } },
  });
  if (!existing) throw notFound('CATEGORY_NOT_FOUND');

  if (existing._count.products > 0) {
    throw badRequest('CATEGORY_HAS_PRODUCTS');
  }

  // Delete subcategories first, then category
  await prisma.$transaction([
    prisma.subCategory.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);

  await createAuditLog({
    action: 'DELETE',
    entity: 'Category',
    entityId: id,
    userId,
    oldData: { name: existing.name },
  });
}

export async function reorderCategories(items: { id: string; order: number }[]) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    ),
  );
}

// SubCategory
export async function createSubCategory(input: CreateSubCategoryInput, userId: string) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw notFound('CATEGORY_NOT_FOUND');

  const maxOrder = await prisma.subCategory.aggregate({
    where: { categoryId: input.categoryId },
    _max: { order: true },
  });

  const sub = await prisma.subCategory.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'SubCategory',
    entityId: sub.id,
    userId,
    newData: { name: input.name, categoryId: input.categoryId },
  });

  return sub;
}

export async function updateSubCategory(id: string, name: string, _userId: string) {
  const existing = await prisma.subCategory.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND', 'SubCategory not found');

  return prisma.subCategory.update({ where: { id }, data: { name } });
}

export async function deleteSubCategory(id: string, userId: string) {
  const existing = await prisma.subCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: { where: { isDeleted: false } } } } },
  });
  if (!existing) throw notFound('NOT_FOUND', 'SubCategory not found');

  if (existing._count.products > 0) {
    throw badRequest('CATEGORY_HAS_PRODUCTS', 'SubCategory has products');
  }

  await prisma.subCategory.delete({ where: { id } });

  await createAuditLog({
    action: 'DELETE',
    entity: 'SubCategory',
    entityId: id,
    userId,
    oldData: { name: existing.name },
  });
}
