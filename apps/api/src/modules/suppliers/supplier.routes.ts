import type { FastifyInstance } from 'fastify';
import { createSupplierSchema, updateSupplierSchema, supplierImportSchema, supplierPaymentSchema, paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as supplierService from './supplier.service.js';

export async function supplierRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN'), validateQuery(paginationSchema)] }, async (request, reply) => {
    const query = request.query as { page: number; limit: number; search?: string };
    const result = await supplierService.listSuppliers(query);
    reply.send({ success: true, ...result });
  });

  // ── IMPORTANT: static routes must be defined BEFORE /:id ──
  app.get('/imports/stats', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const q = request.query as { start?: string; end?: string };
    const data = await supplierService.getImportStats(q.start, q.end);
    reply.send({ success: true, data });
  });

  app.get('/imports', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const q = request.query as { filter?: string; page?: string; limit?: string; start?: string; end?: string };
    const filter = (['all', 'cash', 'debt', 'mixed'].includes(q.filter ?? '') ? q.filter : 'all') as 'all' | 'cash' | 'debt' | 'mixed';
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const limit = Math.max(1, parseInt(q.limit ?? '50', 10) || 50);
    const result = await supplierService.listImports(filter, page, limit, q.start, q.end);
    reply.send({ success: true, ...result });
  });

  app.get('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const supplier = await supplierService.getSupplier(id);
    reply.send({ success: true, data: supplier });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createSupplierSchema)] }, async (request, reply) => {
    const body = request.body as Parameters<typeof supplierService.createSupplier>[0];
    const supplier = await supplierService.createSupplier(body, request.userId);
    reply.status(201).send({ success: true, data: supplier });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateSupplierSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof supplierService.updateSupplier>[1];
    const supplier = await supplierService.updateSupplier(id, body, request.userId);
    reply.send({ success: true, data: supplier });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await supplierService.softDeleteSupplier(id, request.userId);
    reply.send({ success: true, data: null });
  });

  // POST /api/v1/suppliers/:id/import — new import
  app.post('/:id/import', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(supplierImportSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof supplierService.createImport>[1];
    const result = await supplierService.createImport(id, body, request.userId);
    reply.status(201).send({ success: true, data: result });
  });

  // POST /api/v1/suppliers/:id/payment — make payment
  app.post('/:id/payment', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(supplierPaymentSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof supplierService.makePayment>[1];
    const result = await supplierService.makePayment(id, body, request.userId);
    reply.send({ success: true, data: result });
  });

  // PATCH /api/v1/suppliers/:id/transactions/:txnId — edit note / paidAmount
  app.patch('/:id/transactions/:txnId', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const { id, txnId } = request.params as { id: string; txnId: string };
    const body = request.body as { note?: string | null; paidAmount?: number };
    await supplierService.updateTransaction(id, txnId, body, request.userId);
    reply.send({ success: true });
  });

  // DELETE /api/v1/suppliers/:id/transactions/:txnId — delete + reverse side effects
  app.delete('/:id/transactions/:txnId', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const { id, txnId } = request.params as { id: string; txnId: string };
    await supplierService.deleteTransaction(id, txnId, request.userId);
    reply.send({ success: true });
  });
}
