import { z } from 'zod';
import { priceSchema } from './common.js';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  price: priceSchema,
  costPrice: priceSchema,
  dollarRate: z.number().min(0).optional(),
  stock: z.number().int().default(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.enum(['PIECE', 'KG', 'METER', 'SET', 'PACK', 'BOX']).default('PIECE'),
  categoryId: z.string().uuid(),
  subCategoryId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  discount1Qty: z.number().int().min(0).default(0),
  discount1Pct: z.number().min(0).max(100).default(0),
  discount2Qty: z.number().int().min(0).default(0),
  discount2Pct: z.number().min(0).max(100).default(0),
  discount3Qty: z.number().int().min(0).default(0),
  discount3Pct: z.number().min(0).max(100).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
});

export const createSubCategorySchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().uuid(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(0),
    }),
  ),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateSubCategoryInput = z.infer<typeof createSubCategorySchema>;
