import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  categoryId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createContactCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const contactImportSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  })).min(1).max(1000),
  categoryId: z.string().uuid().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ContactImportInput = z.infer<typeof contactImportSchema>;
