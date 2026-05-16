import type { FastifyInstance } from 'fastify';
import { createProductSchema, updateProductSchema, bulkUpdateProductsSchema, idParamSchema } from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateParams } from '../../plugins/validate.js';
import * as service from './product.service.js';
import { emitToAll } from '../../websocket/index.js';

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = req.query as Record<string, string>;
    const result = await service.listProducts({
      page: Number(q.page) || 1,
      limit: Math.min(Number(q.limit) || 20, 2000),
      search: q.search,
      categoryId: q.categoryId,
      subCategoryId: q.subCategoryId,
      warehouseId: q.warehouseId,
      stockStatus: q.stockStatus as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE',
      priceStatus: q.priceStatus as 'WITH_PRICE' | 'NO_PRICE',
      sortBy: q.sortBy,
      sortOrder: (q.sortOrder as 'asc' | 'desc') ?? 'desc',
    });
    reply.send({ success: true, ...result });
  });

  // GET /api/v1/products/stats — stock summary
  app.get('/stats', { preHandler: [requireAuth] }, async (_req, reply) => {
    const stats = await service.getProductStats();
    reply.send({ success: true, data: stats });
  });

  // GET /api/v1/products/low-stock — kam qolgan va tugagan mahsulotlar
  app.get('/low-stock', { preHandler: [requireAuth] }, async (req, reply) => {
    const q = req.query as { limit?: string };
    const products = await service.getLowStockProducts(Math.min(Number(q.limit) || 100, 500));
    reply.send({ success: true, data: products });
  });

  // Code lookup — yordamchilar uchun
  app.get('/code/:code', { preHandler: [requireAuth] }, async (req, reply) => {
    const { code } = req.params as { code: string };
    const product = await service.getProductByCode(Number(code));
    reply.send({ success: true, data: product });
  });

  app.get('/:id', { preHandler: [requireAuth, validateParams(idParamSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await service.getProduct(id);
    reply.send({ success: true, data: product });
  });

  app.post('/', { preHandler: [requireRole('ADMIN'), validateBody(createProductSchema)] }, async (req, reply) => {
    const product = await service.createProduct(
      req.body as Parameters<typeof service.createProduct>[0],
      req.userId,
    );
    try { emitToAll('product:created', { id: product.id, name: product.name }); } catch { /* */ }
    reply.status(201).send({ success: true, data: product });
  });

  app.patch('/bulk', { preHandler: [requireRole('ADMIN'), validateBody(bulkUpdateProductsSchema)] }, async (req, reply) => {
    const result = await service.bulkUpdateProducts(
      req.body as Parameters<typeof service.bulkUpdateProducts>[0],
      req.userId,
    );
    try { emitToAll('product:bulkUpdated', { count: result.updated }); } catch { /* */ }
    reply.send({ success: true, data: result });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateProductSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await service.updateProduct(
      id,
      req.body as Parameters<typeof service.updateProduct>[1],
      req.userId,
    );
    try { emitToAll('product:updated', { id: product.id, name: product.name }); } catch { /* */ }
    reply.send({ success: true, data: product });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.softDeleteProduct(id, req.userId);
    try { emitToAll('product:deleted', { id }); } catch { /* */ }
    reply.send({ success: true, data: null });
  });
}
