import type { FastifyInstance } from 'fastify';
import {
  createCategorySchema,
  createSubCategorySchema,
  reorderCategoriesSchema,
  idParamSchema,
} from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import * as service from './category.service.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, async (_req, reply) => {
    const categories = await service.listCategories();
    reply.send({ success: true, data: categories });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createCategorySchema)] }, async (req, reply) => {
    const category = await service.createCategory(req.body as { name: string; icon?: string }, req.userId);
    reply.status(201).send({ success: true, data: category });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(createCategorySchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const category = await service.updateCategory(id, req.body as { name: string; icon?: string }, req.userId);
    reply.send({ success: true, data: category });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.deleteCategory(id, req.userId);
    reply.send({ success: true, data: null });
  });

  app.put('/reorder', { preHandler: [requireRole('ADMIN'), validateBody(reorderCategoriesSchema)] }, async (req, reply) => {
    const body = req.body as { items: { id: string; order: number }[] };
    await service.reorderCategories(body.items);
    reply.send({ success: true, data: null });
  });

  // SubCategories
  app.post('/sub', { preHandler: [requireRole('ADMIN'), validateBody(createSubCategorySchema)] }, async (req, reply) => {
    const sub = await service.createSubCategory(req.body as { name: string; categoryId: string }, req.userId);
    reply.status(201).send({ success: true, data: sub });
  });

  app.patch('/sub/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name } = req.body as { name: string };
    const sub = await service.updateSubCategory(id, name, req.userId);
    reply.send({ success: true, data: sub });
  });

  app.delete('/sub/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.deleteSubCategory(id, req.userId);
    reply.send({ success: true, data: null });
  });
}
