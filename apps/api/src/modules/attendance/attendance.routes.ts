import type { FastifyInstance } from 'fastify';
import { checkInSchema, createStoreLocationSchema, updateStoreLocationSchema, idParamSchema } from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as service from './attendance.service.js';
import { z } from 'zod';

const userMonthQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function attendanceRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/attendance/check-in
  app.post('/check-in', { preHandler: [requireAuth, validateBody(checkInSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof checkInSchema>;
    const result = await service.checkIn(request.userId, body);
    reply.status(201).send({ success: true, data: result });
  });

  // POST /api/v1/attendance/check-out
  app.post('/check-out', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await service.checkOut(request.userId);
    reply.send({ success: true, data: result });
  });

  // GET /api/v1/attendance/today
  app.get('/today', { preHandler: [requireRole('ADMIN')] }, async (_request, reply) => {
    const result = await service.getTodayAttendance();
    reply.send({ success: true, data: result });
  });

  // GET /api/v1/attendance/user/:id?month=2026-03
  app.get('/user/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateQuery(userMonthQuery)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month: string };
    const result = await service.getUserAttendance(id, month);
    reply.send({ success: true, data: result });
  });

  // Store Location CRUD
  app.get('/store-locations', { preHandler: [requireAuth] }, async (_request, reply) => {
    const locations = await service.getStoreLocations();
    reply.send({ success: true, data: locations });
  });

  app.post('/store-locations', { preHandler: [requireRole('ADMIN'), validateBody(createStoreLocationSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createStoreLocationSchema>;
    const location = await service.createStoreLocation(body, request.userId);
    reply.status(201).send({ success: true, data: location });
  });

  app.patch('/store-locations/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateStoreLocationSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateStoreLocationSchema>;
    const location = await service.updateStoreLocation(id, body, request.userId);
    reply.send({ success: true, data: location });
  });

  app.delete('/store-locations/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteStoreLocation(id, request.userId);
    reply.send({ success: true, data: null });
  });
}
