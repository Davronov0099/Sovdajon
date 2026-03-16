import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum(['RENT', 'SALARY', 'UTILITIES', 'TRANSPORT', 'MARKETING', 'REPAIR', 'TAX', 'OTHER']),
  amount: z.number().min(1),
  description: z.string().min(1).max(500),
  date: z.string().datetime().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
