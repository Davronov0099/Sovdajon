import { z } from 'zod';

export const salaryMonthQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
});

export const calculateAllSalarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const paySalarySchema = z.object({
  method: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
});

export const salarySettingSchema = z.object({
  userId: z.string().uuid(),
  baseSalary: z.number().min(0),
  salesPercent: z.number().min(0).max(100).default(0),
});

export const updateSalarySettingSchema = salarySettingSchema.partial().omit({ userId: true });

export const createAdvanceSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().min(1),
  reason: z.string().max(500).optional(),
});

export const advanceListQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
});

export const createFineSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().min(1),
  reason: z.enum(['LATE', 'ABSENT', 'ERROR', 'OTHER']),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  note: z.string().max(500).optional(),
});

export type CalculateAllSalaryInput = z.infer<typeof calculateAllSalarySchema>;
export type SalarySettingInput = z.infer<typeof salarySettingSchema>;
export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;
export type CreateFineInput = z.infer<typeof createFineSchema>;
