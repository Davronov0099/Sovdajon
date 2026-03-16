import type { FastifyInstance } from 'fastify';
import { createWarehouseSchema, updateWarehouseSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { z } from 'zod';

export async function warehouseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN', 'HELPER')] }, async (_request, reply) => {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { createdAt: 'desc' } });
    reply.send({ success: true, data: warehouses });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createWarehouseSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createWarehouseSchema>;
    const warehouse = await prisma.warehouse.create({ data: body });
    await createAuditLog({ action: 'CREATE', entity: 'Warehouse', entityId: warehouse.id, userId: request.userId });
    reply.status(201).send({ success: true, data: warehouse });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateWarehouseSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateWarehouseSchema>;
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND', 'Ombor topilmadi');
    const warehouse = await prisma.warehouse.update({ where: { id }, data: body });
    await createAuditLog({ action: 'UPDATE', entity: 'Warehouse', entityId: id, userId: request.userId });
    reply.send({ success: true, data: warehouse });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND', 'Ombor topilmadi');
    await prisma.warehouse.delete({ where: { id } });
    await createAuditLog({ action: 'DELETE', entity: 'Warehouse', entityId: id, userId: request.userId });
    reply.send({ success: true, data: null });
  });
}
