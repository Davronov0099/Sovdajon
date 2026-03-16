import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { idParamSchema } from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { z } from 'zod';

const openSessionSchema = z.object({
  openingBalance: z.number().min(0).default(0),
});

const closeSessionSchema = z.object({
  closingBalance: z.number().min(0),
  note: z.string().max(500).optional(),
});

export async function cashierSessionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/cashier-sessions — open
  app.post('/', { preHandler: [requireAuth, validateBody(openSessionSchema)] }, async (request, reply) => {
    // Check if already has open session
    const existing = await prisma.cashierSession.findFirst({
      where: { userId: request.userId, closedAt: null },
    });
    if (existing) {
      throw badRequest('VALIDATION_ERROR', 'Allaqachon ochiq sessiya bor');
    }

    const { openingBalance } = request.body as z.infer<typeof openSessionSchema>;
    const session = await prisma.cashierSession.create({
      data: {
        userId: request.userId,
        openingBalance: new Prisma.Decimal(openingBalance),
      },
    });
    reply.status(201).send({ success: true, data: session });
  });

  // PUT /api/v1/cashier-sessions/:id/close
  app.put('/:id/close', { preHandler: [requireAuth, validateParams(idParamSchema), validateBody(closeSessionSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { closingBalance, note } = request.body as z.infer<typeof closeSessionSchema>;

    const session = await prisma.cashierSession.findUnique({ where: { id } });
    if (!session) throw notFound('NOT_FOUND');
    if (session.userId !== request.userId && request.userRole !== 'ADMIN') {
      throw badRequest('AUTH_FORBIDDEN');
    }
    if (session.closedAt) {
      throw badRequest('VALIDATION_ERROR', 'Sessiya allaqachon yopilgan');
    }

    const updated = await prisma.cashierSession.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closingBalance: new Prisma.Decimal(closingBalance),
        note,
      },
    });
    reply.send({ success: true, data: updated });
  });

  // GET /api/v1/cashier-sessions — list (Admin only)
  app.get('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    const userId = (request.query as Record<string, string>).userId;
    const sessions = await prisma.cashierSession.findMany({
      where: userId ? { userId } : undefined,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
    reply.send({ success: true, data: sessions });
  });

  // GET /api/v1/cashier-sessions/current — current user's open session
  app.get('/current', { preHandler: [requireAuth] }, async (request, reply) => {
    const session = await prisma.cashierSession.findFirst({
      where: { userId: request.userId, closedAt: null },
    });
    reply.send({ success: true, data: session });
  });
}
