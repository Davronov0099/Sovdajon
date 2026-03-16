import type { FastifyInstance } from 'fastify';
import { createReturnSchema } from '@sardorbek/shared';
import type { CreateReturnInput } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody } from '../../plugins/validate.js';
import * as returnService from './return.service.js';

export async function returnRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createReturnSchema)] }, async (request, reply) => {
    const body = request.body as CreateReturnInput;
    const result = await returnService.createPartialReturn(body, request.userId);
    reply.status(201).send({ success: true, data: result });
  });
}
