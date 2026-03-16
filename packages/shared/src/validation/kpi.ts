import { z } from 'zod';

export const createKpiTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  targetValue: z.number().min(0),
  unit: z.enum(['count', 'sum', 'percent']),
  bonusAmount: z.number().min(0),
});

export const updateKpiTemplateSchema = createKpiTemplateSchema.partial();

export const createKpiAssignmentSchema = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const createKpiRecordSchema = z.object({
  assignmentId: z.string().uuid(),
  value: z.number().min(0),
});

export const kpiAssignmentQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  userId: z.string().uuid().optional(),
});

export type CreateKpiTemplateInput = z.infer<typeof createKpiTemplateSchema>;
export type CreateKpiAssignmentInput = z.infer<typeof createKpiAssignmentSchema>;
export type CreateKpiRecordInput = z.infer<typeof createKpiRecordSchema>;
