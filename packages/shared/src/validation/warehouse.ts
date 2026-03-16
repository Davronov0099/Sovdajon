import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
