import { z } from 'zod';

export const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  qrToken: z.string().optional(),
});

export const checkOutSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const attendanceListQuery = z.object({
  userId: z.string().uuid().optional(),
  date: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createStoreLocationSchema = z.object({
  name: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().int().min(10).max(5000).default(100),
});

export const updateStoreLocationSchema = createStoreLocationSchema.partial();

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CreateStoreLocationInput = z.infer<typeof createStoreLocationSchema>;
