import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { createFineSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { z } from 'zod';

const fineQuery = z.object({
  userId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function fineRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const { userId, month } = request.query as z.infer<typeof fineQuery>;
    const where: Prisma.FineWhereInput = {
      ...(userId && { userId }),
      ...(month && { month }),
    };
    const fines = await prisma.fine.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    reply.send({ success: true, data: fines });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createFineSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createFineSchema>;
    const fine = await prisma.fine.create({
      data: {
        userId: body.userId,
        amount: new Prisma.Decimal(body.amount),
        reason: body.reason,
        month: body.month,
        note: body.note ?? null,
        createdById: request.userId,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    await createAuditLog({ action: 'CREATE', entity: 'Fine', entityId: fine.id, userId: request.userId, newData: { amount: body.amount, reason: body.reason } });
    reply.status(201).send({ success: true, data: fine });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const fine = await prisma.fine.findUnique({ where: { id } });
    if (!fine) throw notFound('NOT_FOUND');
    await prisma.fine.delete({ where: { id } });
    await createAuditLog({ action: 'DELETE', entity: 'Fine', entityId: id, userId: request.userId });
    reply.send({ success: true, data: null });
  });
}
