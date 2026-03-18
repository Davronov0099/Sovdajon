import type { FastifyInstance } from 'fastify';
import { createReceiptSchema, paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as receiptService from './receipt.service.js';
import { z } from 'zod';

const listQuery = paginationSchema.extend({
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isDraft: z.coerce.boolean().optional(),
});

const offlineReceiptSchema = z.object({
  offlineId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    discount: z.number().min(0).max(100).default(0),
  })).min(1),
  paymentMethod: z.enum(['CASH', 'CARD', 'CLICK', 'TRANSFER', 'DEBT', 'MIXED']),
  customerId: z.string().uuid().optional(),
  cashReceived: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).default(0),
});

const offlineSyncSchema = z.object({
  receipts: z.array(offlineReceiptSchema),
});

export async function receiptRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createReceiptSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createReceiptSchema>;
    const receipt = await receiptService.createReceipt(body, request.userId);
    reply.status(201).send({ success: true, data: receipt });
  });

  app.get('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateQuery(listQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof listQuery>;
    const result = await receiptService.listReceipts({
      ...query,
      createdById: request.userRole === 'CASHIER' ? request.userId : undefined,
    });
    reply.send({ success: true, ...result });
  });

  app.get('/:id', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipt = await receiptService.getReceipt(id);
    reply.send({ success: true, data: receipt });
  });

  app.post('/draft', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createReceiptSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createReceiptSchema>;
    const draft = await receiptService.saveDraft(body, request.userId);
    reply.status(201).send({ success: true, data: draft });
  });

  // Helper cart — yordamchi savat yaratish
  app.post('/helper-cart', { preHandler: [requireRole('ADMIN', 'CASHIER', 'HELPER'), validateBody(createReceiptSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createReceiptSchema>;
    const draft = await receiptService.saveDraft(body, request.userId, 'HELPER');
    reply.status(201).send({ success: true, data: draft });
  });

  // Helper carts — kassir ko'rishi uchun
  app.get('/helper-carts', { preHandler: [requireRole('ADMIN', 'CASHIER')] }, async (_request, reply) => {
    const result = await receiptService.listHelperCarts();
    reply.send({ success: true, data: result });
  });

  app.delete('/draft/:id', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await receiptService.deleteDraft(id, request.userId, request.userRole);
    reply.send({ success: true, data: null });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await receiptService.deleteReceipt(id, request.userId);
    reply.send({ success: true, data: null });
  });

  app.post('/offline-sync', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(offlineSyncSchema)] }, async (request, reply) => {
    const { receipts } = request.body as z.infer<typeof offlineSyncSchema>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await receiptService.offlineSync(receipts as any, request.userId);
    reply.send({ success: true, data: results });
  });
}
