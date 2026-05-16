import { z } from 'zod';

export const phoneSchema = z
  .string()
  .regex(/^\+998\d{9}$/, 'Telefon: +998XXXXXXXXX formatida bo\'lishi kerak');

export const passwordSchema = z
  .string()
  .min(6, 'Kamida 6 ta belgi')
  .regex(/[a-zA-Z]/, 'Kamida 1 ta harf')
  .regex(/\d/, 'Kamida 1 ta raqam');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const priceSchema = z.number().min(0).max(999_999_999);

export const quantitySchema = z.number().int().min(1).max(999_999);
