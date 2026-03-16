import type { FastifyInstance } from 'fastify';
import { createKpiTemplateSchema, updateKpiTemplateSchema, createKpiAssignmentSchema, createKpiRecordSchema, kpiAssignmentQuery, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import * as kpiService from './kpi.service.js';
import { z } from 'zod';

export async function kpiRoutes(app: FastifyInstance): Promise<void> {
  // Templates
  app.get('/templates', { preHandler: [requireRole('ADMIN')] }, async (_request, reply) => {
    const templates = await kpiService.listTemplates();
    reply.send({ success: true, data: templates });
  });

  app.post('/templates', { preHandler: [requireRole('ADMIN'), validateBody(createKpiTemplateSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createKpiTemplateSchema>;
    const template = await kpiService.createTemplate(body);
    reply.status(201).send({ success: true, data: template });
  });

  app.patch('/templates/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateKpiTemplateSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateKpiTemplateSchema>;
    const template = await kpiService.updateTemplate(id, body);
    reply.send({ success: true, data: template });
  });

  app.delete('/templates/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await kpiService.deleteTemplate(id);
    reply.send({ success: true, data: null });
  });

  // Assignments
  app.get('/assignments', { preHandler: [requireRole('ADMIN'), validateQuery(kpiAssignmentQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof kpiAssignmentQuery>;
    const assignments = await kpiService.listAssignments(query);
    reply.send({ success: true, data: assignments });
  });

  app.post('/assignments', { preHandler: [requireRole('ADMIN'), validateBody(createKpiAssignmentSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createKpiAssignmentSchema>;
    const assignment = await kpiService.createAssignment(body);
    reply.status(201).send({ success: true, data: assignment });
  });

  app.delete('/assignments/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await kpiService.deleteAssignment(id);
    reply.send({ success: true, data: null });
  });

  // Records
  app.get('/assignments/:id/records', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await kpiService.getAssignmentRecords(id);
    reply.send({ success: true, data: result });
  });

  app.post('/records', { preHandler: [requireRole('ADMIN'), validateBody(createKpiRecordSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createKpiRecordSchema>;
    const record = await kpiService.createRecord(body, request.userId);
    reply.status(201).send({ success: true, data: record });
  });
}
