import type { FastifyInstance } from 'fastify';
import { createAdvanceSchema, advanceListQuery, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as advanceService from './advance.service.js';
import { z } from 'zod';

export async function advanceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN'), validateQuery(advanceListQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof advanceListQuery>;
    const result = await advanceService.listAdvances(query);
    reply.send({ success: true, ...result });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createAdvanceSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createAdvanceSchema>;
    const advance = await advanceService.createAdvance(body, request.userId);
    reply.status(201).send({ success: true, data: advance });
  });

  app.post('/:id/approve', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await advanceService.approveAdvance(id, request.userId);
    reply.send({ success: true, data: result });
  });

  app.post('/:id/reject', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await advanceService.rejectAdvance(id, request.userId);
    reply.send({ success: true, data: result });
  });
}
