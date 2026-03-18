import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  company: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierImportItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  sellingPrice: z.number().min(0).optional(),
});

export const supplierImportSchema = z.object({
  items: z.array(supplierImportItemSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
  currency: z.enum(['UZS', 'USD']).default('UZS'),
  rate: z.number().min(0).default(1),
  note: z.string().max(500).optional(),
});

export const supplierPaymentSchema = z.object({
  amount: z.number().min(1),
  note: z.string().max(500).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type SupplierImportInput = z.infer<typeof supplierImportSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
