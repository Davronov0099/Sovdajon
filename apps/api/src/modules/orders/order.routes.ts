import type { FastifyInstance } from 'fastify';
import { createOrderSchema, updateOrderStatusSchema, orderListQuery, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as orderService from './order.service.js';
import { z } from 'zod';

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateQuery(orderListQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof orderListQuery>;
    const result = await orderService.listOrders(query);
    reply.send({ success: true, ...result });
  });

  app.get('/:id', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await orderService.getOrder(id);
    reply.send({ success: true, data: order });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createOrderSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createOrderSchema>;
    const order = await orderService.createOrder(body, request.userId);
    reply.status(201).send({ success: true, data: order });
  });

  app.patch('/:id/status', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateOrderStatusSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateOrderStatusSchema>;
    const order = await orderService.updateOrderStatus(id, body, request.userId);
    reply.send({ success: true, data: order });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await orderService.deleteOrder(id, request.userId);
    reply.send({ success: true, data: null });
  });
}
