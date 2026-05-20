import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  period: z.enum(['today', 'month', 'year', 'all']).optional().default('today'),
  type: z.enum(['all', 'cash', 'debt']).optional().default('all'),
  view: z.enum(['table', 'card', 'list']).optional().default('table'),
});

export const Route = createFileRoute('/_auth/sales')({
  validateSearch: searchSchema,
});
