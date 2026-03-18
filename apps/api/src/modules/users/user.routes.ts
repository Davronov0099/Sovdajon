import type { FastifyInstance } from 'fastify';
import { createUserSchema, updateUserSchema, idParamSchema } from '@sardorbek/shared';
import { z } from 'zod';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import * as userService from './user.service.js';

const resetPasswordSchema = z.object({
  password: z.string().min(4),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/users — ro'yxat
  app.get('/', { preHandler: [requireRole('ADMIN')] }, async () => {
    const data = await userService.listUsers();
    return { success: true, data };
  });

  // POST /api/v1/users — yaratish
  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createUserSchema)] }, async (request, reply) => {
    const input = request.body as z.infer<typeof createUserSchema>;
    const data = await userService.createUser(input, request.userId!);
    return reply.status(201).send({ success: true, data });
  });

  // PATCH /api/v1/users/:id — tahrirlash
  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateUserSchema)] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = request.body as z.infer<typeof updateUserSchema>;
    const data = await userService.updateUser(id, input, request.userId!);
    return { success: true, data };
  });

  // DELETE /api/v1/users/:id — o'chirish
  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request) => {
    const { id } = request.params as { id: string };
    await userService.softDeleteUser(id, request.userId!);
    return { success: true, data: null };
  });

  // POST /api/v1/users/:id/reset-password — parolni tiklash
  app.post('/:id/reset-password', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(resetPasswordSchema)] }, async (request) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password: string };
    await userService.resetPassword(id, password, request.userId!);
    return { success: true, data: null };
  });
}
