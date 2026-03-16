import { prisma } from '../config/database.js';

/**
 * Atomically decrement product stock using Prisma's atomic operations.
 * Prevents race conditions when multiple cashiers sell simultaneously.
 */
export async function decrementStock(productId: string, quantity: number): Promise<number> {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: { decrement: quantity },
    },
    select: { stock: true },
  });
  return product.stock;
}

/**
 * Atomically increment product stock (returns, supplier imports).
 */
export async function incrementStock(productId: string, quantity: number): Promise<number> {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: { increment: quantity },
    },
    select: { stock: true },
  });
  return product.stock;
}

/**
 * Batch decrement stock for multiple items in a transaction.
 * Used in receipt creation.
 */
export async function batchDecrementStock(
  items: { productId: string; quantity: number }[],
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }),
    ),
  );
}

/**
 * Batch increment stock for returns.
 */
export async function batchIncrementStock(
  items: { productId: string; quantity: number }[],
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      }),
    ),
  );
}
