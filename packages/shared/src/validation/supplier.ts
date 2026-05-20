import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  company: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierImportItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),              // Tan narxi (kirim narxi)
  sellingPrice: z.number().min(0).optional(),     // Dona narxi (asosiy sotuv)
  minSellingPrice: z.number().min(0).optional(),  // Min sotuv narxi
  wholesalePrice: z.number().min(0).optional(),   // Optom sotuv narxi
});

export const supplierImportSchema = z.object({
  items: z.array(supplierImportItemSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
  note: z.string().max(500).optional(),
  /** Naqd to'lov miqdori (so'm). 0 = to'liq qarz, total = to'liq naqd. */
  paidAmount: z.number().min(0).optional().default(0),
});

export const supplierPaymentSchema = z.object({
  amount: z.number().min(1),
  note: z.string().max(500).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type SupplierImportInput = z.infer<typeof supplierImportSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
