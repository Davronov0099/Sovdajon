import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { createPartnerSchema, updatePartnerSchema, partnerPaymentSchema, paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { z } from 'zod';

export async function partnerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireRole('ADMIN'), validateQuery(paginationSchema)] }, async (request, reply) => {
    const { page, limit, search } = request.query as { page: number; limit: number; search?: string };
    const skip = (page - 1) * limit;
    const where: Prisma.PartnerWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      prisma.partner.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { payments: true } } },
      }),
      prisma.partner.count({ where }),
    ]);
    reply.send({ success: true, data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  });

  app.get('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!partner) throw notFound('NOT_FOUND', 'Hamkor topilmadi');
    reply.send({ success: true, data: partner });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createPartnerSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createPartnerSchema>;
    const partner = await prisma.partner.create({ data: body });
    await createAuditLog({ action: 'CREATE', entity: 'Partner', entityId: partner.id, userId: request.userId });
    reply.status(201).send({ success: true, data: partner });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updatePartnerSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updatePartnerSchema>;
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND');
    const partner = await prisma.partner.update({ where: { id }, data: body });
    await createAuditLog({ action: 'UPDATE', entity: 'Partner', entityId: id, userId: request.userId, oldData: { name: existing.name, company: existing.company }, newData: body as Record<string, unknown> });
    reply.send({ success: true, data: partner });
  });

  // POST /api/v1/partners/:id/payment — IN or OUT
  app.post('/:id/payment', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(partnerPaymentSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof partnerPaymentSchema>;
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) throw notFound('NOT_FOUND');

    const balanceChange = body.type === 'IN'
      ? new Prisma.Decimal(body.amount)
      : new Prisma.Decimal(-body.amount);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.partnerPayment.create({
        data: {
          partnerId: id,
          amount: new Prisma.Decimal(body.amount),
          type: body.type,
          note: body.note ?? null,
        },
      });
      const updated = await tx.partner.update({
        where: { id },
        data: { balance: { increment: balanceChange } },
      });
      return { payment, partner: updated };
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'PartnerPayment',
      entityId: result.payment.id,
      userId: request.userId,
      newData: { amount: body.amount, type: body.type, partnerId: id },
    });

    reply.send({ success: true, data: result });
  });
}
