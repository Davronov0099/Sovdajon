import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole, requireAuth } from '../../plugins/auth.js';
import { validateBody } from '../../plugins/validate.js';
import * as settingsService from './settings.service.js';

const updateSettingSchema = z.object({
  value: z.string().min(1),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/settings — all settings
  app.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    const settings = await settingsService.getAllSettings();
    reply.send({ success: true, data: settings });
  });

  // PATCH /api/v1/settings/:key — update any setting
  app.patch('/:key', { preHandler: [requireRole('ADMIN'), validateBody(updateSettingSchema)] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as z.infer<typeof updateSettingSchema>;
    const result = await settingsService.updateSetting(key, value, request.userId);
    reply.send({ success: true, data: result });
  });
}
