import type { FastifyInstance } from 'fastify';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseIssueSchema,
  warehouseTransferSchema,
  idParamSchema,
} from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import * as warehouseService from './warehouse.service.js';
import { z } from 'zod';

export async function warehouseRoutes(app: FastifyInstance): Promise<void> {
  /* ─────── LIST ─────── */
  app.get('/', { preHandler: [requireRole('ADMIN', 'HELPER')] }, async (_request, reply) => {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            warehouseStocks: { where: { quantity: { gt: 0 } } },
          },
        },
      },
    });
    // _count.warehouseStocks => products (UI moslamasi uchun qayta nomlash)
    const data = warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      createdAt: w.createdAt,
      _count: { products: w._count.warehouseStocks },
    }));
    reply.send({ success: true, data });
  });

  /* ─────── CREATE ─────── */
  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createWarehouseSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createWarehouseSchema>;
    const warehouse = await prisma.warehouse.create({ data: body });
    await createAuditLog({ action: 'CREATE', entity: 'Warehouse', entityId: warehouse.id, userId: request.userId });
    reply.status(201).send({ success: true, data: warehouse });
  });

  /* ─────── UPDATE ─────── */
  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateWarehouseSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateWarehouseSchema>;
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND', 'Ombor topilmadi');
    const warehouse = await prisma.warehouse.update({ where: { id }, data: body });
    await createAuditLog({ action: 'UPDATE', entity: 'Warehouse', entityId: id, userId: request.userId });
    reply.send({ success: true, data: warehouse });
  });

  /* ─────── DELETE ─────── */
  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND', 'Ombor topilmadi');
    await prisma.warehouse.delete({ where: { id } });
    await createAuditLog({ action: 'DELETE', entity: 'Warehouse', entityId: id, userId: request.userId });
    reply.send({ success: true, data: null });
  });

  /* ─────── DETAIL: GET /:id ─────── */
  app.get('/:id', { preHandler: [requireRole('ADMIN', 'HELPER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await warehouseService.getWarehouseDetail(id);
    reply.send({ success: true, data });
  });

  /* ─────── PRODUCTS: GET /:id/products ─────── */
  app.get('/:id/products', { preHandler: [requireRole('ADMIN', 'HELPER'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as Record<string, string>;
    const result = await warehouseService.listWarehouseProducts({
      warehouseId: id,
      page: Math.max(1, Number(q.page) || 1),
      limit: Math.min(Number(q.limit) || 50, 500),
      search: q.search || undefined,
      categoryId: q.categoryId || undefined,
    });
    reply.send({ success: true, ...result });
  });

  /* ─────── MOVEMENTS: GET /:id/movements ─────── */
  app.get('/:id/movements', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as Record<string, string>;
    const result = await warehouseService.listWarehouseMovements({
      warehouseId: id,
      page: Math.max(1, Number(q.page) || 1),
      limit: Math.min(Number(q.limit) || 30, 200),
      type: q.type as 'IMPORT' | 'ISSUE_TO_SHOP' | 'TRANSFER' | 'SHOP_RETURN' | 'ADJUSTMENT' | undefined,
    });
    reply.send({ success: true, ...result });
  });

  /* ─────── ISSUE TO SHOP: POST /:id/issue ─────── */
  app.post(
    '/:id/issue',
    { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(warehouseIssueSchema)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof warehouseIssueSchema>;
      const result = await warehouseService.issueToShop(id, body, request.userId);
      reply.status(201).send({ success: true, data: result });
    },
  );

  /* ─────── TRANSFER: POST /:id/transfer ─────── */
  app.post(
    '/:id/transfer',
    { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(warehouseTransferSchema)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof warehouseTransferSchema>;
      const result = await warehouseService.transferToWarehouse(id, body, request.userId);
      reply.status(201).send({ success: true, data: result });
    },
  );
}
