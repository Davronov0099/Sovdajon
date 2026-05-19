import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  filter: z.enum(['all', 'cash', 'debt', 'mixed']).optional().default('all'),
});

export const Route = createFileRoute('/_auth/suppliers_/imports')({
  validateSearch: searchSchema,
});
