import type { FastifyInstance } from 'fastify';
import { paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as orderService from './order.service.js';
import { z } from 'zod';

const listQuery = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  note: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/orders — create order (any authenticated role)
  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER', 'HELPER'), validateBody(createOrderSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createOrderSchema>;
    const order = await orderService.createOrder({
      ...body,
      createdById: request.userId,
    });
    reply.status(201).send({ success: true, data: order });
  });

  // GET /api/v1/orders — list orders
  app.get('/', { preHandler: [requireRole('ADMIN', 'CASHIER', 'HELPER'), validateQuery(listQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof listQuery>;
    const result = await orderService.listOrders(query);
    reply.send({ success: true, ...result });
  });

  // GET /api/v1/orders/:id — get order detail
  app.get('/:id', { preHandler: [requireRole('ADMIN', 'CASHIER', 'HELPER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await orderService.getOrder(id);
    reply.send({ success: true, data: order });
  });

  // PATCH /api/v1/orders/:id/status — update order status (ADMIN only)
  app.patch('/:id/status', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateStatusSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as z.infer<typeof updateStatusSchema>;
    const order = await orderService.updateOrderStatus(id, status);
    reply.send({ success: true, data: order });
  });

  // DELETE /api/v1/orders/:id — delete order (ADMIN only, only PENDING)
  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await orderService.deleteOrder(id);
    reply.send({ success: true, data: null });
  });
}
