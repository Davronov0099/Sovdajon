import type { FastifyInstance } from 'fastify';
import { salaryMonthQuery, calculateAllSalarySchema, salarySettingSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as salaryService from './salary.service.js';
import { z } from 'zod';

const userIdParam = z.object({ userId: z.string().uuid() });

export async function salaryRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/salary?month=2026-03
  app.get('/', { preHandler: [requireRole('ADMIN'), validateQuery(salaryMonthQuery)] }, async (request, reply) => {
    const { month } = request.query as { month: string };
    const salaries = await salaryService.listSalaries(month);
    reply.send({ success: true, data: salaries });
  });

  // GET /api/v1/salary/:id
  app.get('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const salary = await salaryService.getSalary(id);
    reply.send({ success: true, data: salary });
  });

  // POST /api/v1/salary/calculate-all
  app.post('/calculate-all', { preHandler: [requireRole('ADMIN'), validateBody(calculateAllSalarySchema)] }, async (request, reply) => {
    const { month } = request.body as { month: string };
    const results = await salaryService.calculateAll(month, request.userId);
    reply.send({ success: true, data: results });
  });

  // POST /api/v1/salary/:id/pay
  app.post('/:id/pay', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await salaryService.paySalary(id, request.userId);
    reply.send({ success: true, data: result });
  });

  // POST /api/v1/salary/:id/cancel
  app.post('/:id/cancel', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await salaryService.cancelSalary(id, request.userId);
    reply.send({ success: true, data: result });
  });

  // Salary Settings
  app.get('/settings/:userId', { preHandler: [requireRole('ADMIN'), validateParams(userIdParam)] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const setting = await salaryService.getSalarySetting(userId);
    reply.send({ success: true, data: setting });
  });

  app.post('/settings', { preHandler: [requireRole('ADMIN'), validateBody(salarySettingSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof salarySettingSchema>;
    const setting = await salaryService.upsertSalarySetting(body, request.userId);
    reply.send({ success: true, data: setting });
  });
}
