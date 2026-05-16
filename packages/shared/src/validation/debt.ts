import { z } from 'zod';

export const createDebtSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().min(1, 'Summa 0 dan katta bo\'lishi kerak'),
  dueDate: z.string().datetime(),
  note: z.string().max(500).optional(),
  receiptId: z.string().uuid().optional(),
});

export const debtPaymentSchema = z.object({
  amount: z.number().min(1, 'To\'lov summasi 0 dan katta bo\'lishi kerak'),
  method: z.enum(['CASH', 'CARD', 'CLICK', 'TRANSFER']),
  note: z.string().max(500).optional(),
});

export const debtExtendSchema = z.object({
  newDate: z.string().datetime(),
  reason: z.string().min(1).max(500),
});

export const debtListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
  status: z.enum(['ACTIVE', 'PARTIAL', 'PAID', 'OVERDUE', 'CONFLICT']).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;
export type DebtExtendInput = z.infer<typeof debtExtendSchema>;
