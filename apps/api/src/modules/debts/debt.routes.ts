import type { FastifyInstance } from 'fastify';
import { createDebtSchema, debtPaymentSchema, debtExtendSchema, debtListQuery, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as debtService from './debt.service.js';

export async function debtRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/debts — list with stats
  app.get('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateQuery(debtListQuery)] }, async (request, reply) => {
    const query = request.query as unknown as Parameters<typeof debtService.listDebts>[0];
    const result = await debtService.listDebts(query);
    reply.send({ success: true, ...result });
  });

  // GET /api/v1/debts/stats — aggregated stats
  app.get('/stats', { preHandler: [requireRole('ADMIN')] }, async (_request, reply) => {
    const stats = await debtService.getDebtStats();
    reply.send({ success: true, data: stats });
  });

  // GET /api/v1/debts/:id — detail
  app.get('/:id', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const debt = await debtService.getDebt(id);
    reply.send({ success: true, data: debt });
  });

  // POST /api/v1/debts — create (Admin only)
  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createDebtSchema)] }, async (request, reply) => {
    const body = request.body as Parameters<typeof debtService.createDebt>[0];
    const debt = await debtService.createDebt(body, request.userId);
    reply.status(201).send({ success: true, data: debt });
  });

  // POST /api/v1/debts/:id/payment — make payment (Admin only)
  app.post('/:id/payment', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(debtPaymentSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof debtService.makePayment>[1];
    const result = await debtService.makePayment(id, body, request.userId);
    reply.send({ success: true, data: result });
  });

  // POST /api/v1/debts/:id/extend — extend deadline (Admin only)
  app.post('/:id/extend', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(debtExtendSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof debtService.extendDebt>[1];
    const result = await debtService.extendDebt(id, body, request.userId);
    reply.send({ success: true, data: result });
  });
}
