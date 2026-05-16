import { z } from 'zod';
import { priceSchema } from './common.js';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: priceSchema,                                    // Dona narxi
  costPrice: priceSchema,                                // Tan narxi
  minSellingPrice: z.number().min(0).optional(),         // Min sotuv narxi
  wholesalePrice: z.number().min(0).optional(),          // Optom narxi
  stock: z.number().int().default(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.enum(['PIECE', 'KG', 'METER', 'SET', 'PACK', 'BOX']).default('PIECE'),
  categoryId: z.string().uuid(),
  subCategoryId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  images: z.array(z.string()).max(8).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isMarketplaceVisible: z.boolean().optional(),
  showPrice: z.boolean().optional(),
});

export const bulkUpdateProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  data: createProductSchema.partial().refine(
    (d) => Object.keys(d).length > 0,
    { message: 'At least one field must be provided' },
  ),
});

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
export type BulkUpdateProductsInput = z.infer<typeof bulkUpdateProductsSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateSubCategoryInput = z.infer<typeof createSubCategorySchema>;
