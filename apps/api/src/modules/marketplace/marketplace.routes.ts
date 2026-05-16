import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../plugins/auth.js';
import { validateBody } from '../../plugins/validate.js';
import * as service from './marketplace.service.js';

export async function marketplaceRoutes(app: FastifyInstance) {
  // ===== PUBLIC ROUTES (no auth required) =====

  // GET /api/v1/marketplace/products
  app.get('/products', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const result = await service.listMarketplaceProducts({
      search: q.search || undefined,
      categoryId: q.categoryId || undefined,
      page: Math.max(1, Number(q.page) || 1),
      limit: Math.min(Number(q.limit) || 24, 100),
    });
    reply.send({ success: true, data: result });
  });

  // GET /api/v1/marketplace/products/:id
  app.get('/products/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await service.getMarketplaceProduct(id);
    if (!product) return reply.status(404).send({ success: false, error: 'Mahsulot topilmadi' });
    reply.send({ success: true, data: product });
  });

  // GET /api/v1/marketplace/categories
  app.get('/categories', async (_req, reply) => {
    const cats = await service.getMarketplaceCategories();
    reply.send({ success: true, data: cats });
  });

  // GET /api/v1/marketplace/settings
  app.get('/settings', async (_req, reply) => {
    const settings = await service.getCompanySettings();
    reply.send({ success: true, data: settings });
  });

  // GET /api/v1/marketplace/banner-links
  app.get('/banner-links', async (_req, reply) => {
    const links = await service.getBannerLinks();
    reply.send({ success: true, data: links });
  });

  // POST /api/v1/marketplace/orders
  const createOrderSchema = z.object({
    customerName: z.string().min(2, 'Ism kamida 2 ta belgi'),
    customerPhone: z.string().min(9, "Telefon raqam noto'g'ri"),
    address: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1),
        }),
      )
      .min(1, 'Kamida 1 ta mahsulot kerak'),
  });

  app.post('/orders', { preHandler: [validateBody(createOrderSchema)] }, async (req, reply) => {
    const input = req.body as z.infer<typeof createOrderSchema>;
    try {
      const order = await service.createMarketplaceOrder(input);
      reply.status(201).send({ success: true, data: order });
    } catch (err) {
      reply.status(400).send({ success: false, error: (err as Error).message });
    }
  });

  // GET /api/v1/marketplace/orders/:id
  app.get('/orders/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await service.getMarketplaceOrderStatus(Number(id));
    if (!order) return reply.status(404).send({ success: false, error: 'Buyurtma topilmadi' });
    reply.send({ success: true, data: order });
  });

  // ===== ADMIN ROUTES (ADMIN only) =====

  // GET /api/v1/marketplace/admin/orders
  app.get('/admin/orders', { preHandler: [requireRole('ADMIN')] }, async (req, reply) => {
    const q = req.query as Record<string, string>;
    const orders = await service.listMarketplaceOrders(q.status);
    reply.send({ success: true, data: orders });
  });

  // PATCH /api/v1/marketplace/admin/orders/:id/status
  const updateStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED']),
  });

  app.patch(
    '/admin/orders/:id/status',
    { preHandler: [requireRole('ADMIN'), validateBody(updateStatusSchema)] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status } = req.body as z.infer<typeof updateStatusSchema>;
      const order = await service.updateMarketplaceOrderStatus(Number(id), status);
      reply.send({ success: true, data: order });
    },
  );

  // PUT /api/v1/marketplace/admin/banner-links
  const setBannerLinkSchema = z.object({
    bannerName: z.string().min(1),
    productId: z.string().uuid().nullable(),
  });

  app.put(
    '/admin/banner-links',
    { preHandler: [requireRole('ADMIN'), validateBody(setBannerLinkSchema)] },
    async (req, reply) => {
      const { bannerName, productId } = req.body as z.infer<typeof setBannerLinkSchema>;
      await service.setBannerLink(bannerName, productId);
      reply.send({ success: true });
    },
  );
}
