import { z } from 'zod';

export const receiptItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  /** Agar berilsa, mahsulotning standart narxi o'rniga shu ishlatiladi (savatda o'zgartirilgan narx). */
  unitPrice: z.number().min(0).optional(),
});

export const mixedPaymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'CLICK', 'TRANSFER']),
  amount: z.number().min(0),
});

export const createReceiptSchema = z
  .object({
    items: z.array(receiptItemSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
    paymentMethod: z.enum(['CASH', 'CARD', 'CLICK', 'TRANSFER', 'DEBT', 'MIXED']),
    customerId: z.string().uuid().optional(),
    cashReceived: z.number().min(0).optional(),
    mixedPayments: z.array(mixedPaymentSchema).optional(),
    debtDueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === 'DEBT' && !data.customerId) return false;
      return true;
    },
    { message: 'Qarzga sotuv uchun mijoz tanlang', path: ['customerId'] },
  )
  .refine(
    (data) => {
      if (data.paymentMethod === 'MIXED' && (!data.mixedPayments || data.mixedPayments.length < 2))
        return false;
      return true;
    },
    { message: 'Aralash to\'lov uchun kamida 2 ta usul kerak', path: ['mixedPayments'] },
  );

export const createReturnSchema = z.object({
  receiptId: z.string().uuid(),
  items: z
    .array(
      z.object({
        receiptItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, 'Kamida 1 ta mahsulot tanlang'),
  reason: z.string().min(1).max(500),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
