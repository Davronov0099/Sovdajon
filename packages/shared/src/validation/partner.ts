import { z } from 'zod';

export const createPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  company: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export const partnerPaymentSchema = z.object({
  amount: z.number().min(1),
  type: z.enum(['IN', 'OUT']),
  note: z.string().max(500).optional(),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type PartnerPaymentInput = z.infer<typeof partnerPaymentSchema>;
