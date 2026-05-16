import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

// Chiqim item — bitta mahsulot va miqdor
export const stockIssueItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1, "Miqdor 0 dan katta bo'lishi kerak"),
});

// Ombor → Do'kon chiqim (mahsulotlar bo'limiga)
export const warehouseIssueSchema = z.object({
  items: z.array(stockIssueItemSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
  note: z.string().max(500).optional(),
});

// Ombor → Ombor ko'chirish
export const warehouseTransferSchema = z.object({
  toWarehouseId: z.string().uuid({ message: 'Maqsad ombor tanlang' }),
  items: z.array(stockIssueItemSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
  note: z.string().max(500).optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type WarehouseIssueInput = z.infer<typeof warehouseIssueSchema>;
export type WarehouseTransferInput = z.infer<typeof warehouseTransferSchema>;
