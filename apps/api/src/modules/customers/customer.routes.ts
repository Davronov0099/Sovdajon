import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { phoneSchema, paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as customerService from './customer.service.js';

const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  address: z.string().max(300).optional(),
  debtLimit: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const searchQuery = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/search', { preHandler: [requireAuth, validateQuery(searchQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof searchQuery>;
    const data = await customerService.searchCustomers(query.q, query.limit);
    reply.send({ success: true, data });
  });

  app.get('/', { preHandler: [requireAuth, validateQuery(paginationSchema)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof paginationSchema>;
    const result = await customerService.listCustomers(query);
    reply.send({ success: true, ...result });
  });

  app.get('/:id', { preHandler: [requireAuth, validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await customerService.getCustomer(id);
    reply.send({ success: true, data: customer });
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createCustomerSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createCustomerSchema>;
    const customer = await customerService.createCustomer(body, request.userId);
    reply.status(201).send({ success: true, data: customer });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateCustomerSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateCustomerSchema>;
    const customer = await customerService.updateCustomer(id, body, request.userId);
    reply.send({ success: true, data: customer });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await customerService.softDeleteCustomer(id, request.userId);
    reply.send({ success: true, data: null });
  });
}
