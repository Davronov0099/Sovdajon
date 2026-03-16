import { Prisma } from '@prisma/client';
import type { CreateReturnInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { emitToAll } from '../../websocket/index.js';

const RETURN_PERIOD_DAYS = 14;

export async function createPartialReturn(input: CreateReturnInput, userId: string) {
  const { receiptId, items, reason } = input;

  // Get receipt with items
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      items: true,
      returns: { include: { items: true } },
    },
  });

  if (!receipt) throw notFound('RECEIPT_NOT_FOUND');

  // Check return period (14 days)
  const daysSincePurchase = Math.floor(
    (Date.now() - receipt.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSincePurchase > RETURN_PERIOD_DAYS) {
    throw badRequest('RETURN_PERIOD_EXPIRED');
  }

  // Calculate already returned quantities
  const returnedQty = new Map<string, number>();
  for (const ret of receipt.returns) {
    for (const item of ret.items) {
      const current = returnedQty.get(item.productId) ?? 0;
      returnedQty.set(item.productId, current + item.quantity);
    }
  }

  // Validate return items
  const returnItems: { productId: string; quantity: number; unitPrice: Prisma.Decimal; total: Prisma.Decimal }[] = [];
  const stockIncrements: { productId: string; quantity: number }[] = [];
  let returnTotal = 0;

  for (const returnItem of items) {
    const receiptItem = receipt.items.find((ri) => ri.id === returnItem.receiptItemId);
    if (!receiptItem) throw notFound('RECEIPT_NOT_FOUND', `Receipt item ${returnItem.receiptItemId} not found`);

    const alreadyReturned = returnedQty.get(receiptItem.productId) ?? 0;
    const maxReturnable = receiptItem.quantity - alreadyReturned;

    if (returnItem.quantity > maxReturnable) {
      throw badRequest('RETURN_QUANTITY_EXCEEDED', `Max returnable: ${maxReturnable}`);
    }

    if (maxReturnable === 0) {
      throw badRequest('RETURN_ALREADY_RETURNED');
    }

    const itemTotal = Number(receiptItem.unitPrice) * returnItem.quantity;
    returnTotal += itemTotal;

    returnItems.push({
      productId: receiptItem.productId,
      quantity: returnItem.quantity,
      unitPrice: receiptItem.unitPrice,
      total: new Prisma.Decimal(itemTotal),
    });

    stockIncrements.push({
      productId: receiptItem.productId,
      quantity: returnItem.quantity,
    });
  }

  // Create return receipt + restore stock in transaction
  const returnReceipt = await prisma.$transaction(async (tx) => {
    // 1. Restore stock
    for (const inc of stockIncrements) {
      await tx.product.update({
        where: { id: inc.productId },
        data: { stock: { increment: inc.quantity } },
      });
    }

    // 2. Create return receipt
    const created = await tx.returnReceipt.create({
      data: {
        receiptId,
        total: new Prisma.Decimal(returnTotal),
        reason,
        createdById: userId,
        items: { create: returnItems },
      },
      include: { items: true },
    });

    // 3. Reduce debt if receipt was DEBT payment
    if (receipt.paymentMethod === 'DEBT') {
      const debt = await tx.debt.findFirst({
        where: { receiptId, status: { in: ['ACTIVE', 'PARTIAL'] } },
      });

      if (debt) {
        const newRemaining = Math.max(0, Number(debt.remainingAmount) - returnTotal);
        await tx.debt.update({
          where: { id: debt.id },
          data: {
            remainingAmount: new Prisma.Decimal(newRemaining),
            status: newRemaining === 0 ? 'PAID' : debt.status,
          },
        });
      }
    }

    return created;
  });

  await createAuditLog({
    action: 'RETURN',
    entity: 'ReturnReceipt',
    entityId: returnReceipt.id,
    userId,
    newData: {
      receiptId,
      total: returnTotal,
      itemCount: returnItems.length,
      reason,
    },
  });

  // WebSocket
  try {
    emitToAll('receipt:returned', {
      receiptId,
      returnId: returnReceipt.id,
      total: returnTotal,
    });

    for (const inc of stockIncrements) {
      emitToAll('product:updated', { id: inc.productId, stockChange: inc.quantity });
    }
  } catch { /* ignore */ }

  return returnReceipt;
}
