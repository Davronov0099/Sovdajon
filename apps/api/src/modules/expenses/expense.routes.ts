import type { FastifyInstance } from 'fastify';
import { createExpenseSchema, updateExpenseSchema, expenseListQuery, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as expenseService from './expense.service.js';
import { z } from 'zod';

const statsQuery = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN'), validateQuery(expenseListQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof expenseListQuery>;
    const result = await expenseService.listExpenses(query);
    reply.send({ success: true, ...result });
  });

  app.get('/stats', { preHandler: [requireRole('ADMIN'), validateQuery(statsQuery)] }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof statsQuery>;
    const stats = await expenseService.getExpenseStats(startDate, endDate);
    reply.send({ success: true, data: stats });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createExpenseSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createExpenseSchema>;
    const expense = await expenseService.createExpense(body, request.userId);
    reply.status(201).send({ success: true, data: expense });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateExpenseSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateExpenseSchema>;
    const expense = await expenseService.updateExpense(id, body, request.userId);
    reply.send({ success: true, data: expense });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await expenseService.deleteExpense(id, request.userId);
    reply.send({ success: true, data: null });
  });
}
