import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { phoneSchema, paginationSchema, idParamSchema } from '@sardorbek/shared';
import { requireAuth, requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import * as customerService from './customer.service.js';

const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  address: z.string().max(300).optional(),
  debtLimit: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const searchQuery = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

const customerListQuery = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
});

const createCustomerCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/search', { preHandler: [requireAuth, validateQuery(searchQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof searchQuery>;
    const data = await customerService.searchCustomers(query.q, query.limit);
    reply.send({ success: true, data });
  });

  // ── Customer Categories ──
  app.get('/categories', { preHandler: [requireAuth] }, async (_request, reply) => {
    const categories = await prisma.customerCategory.findMany({
      include: { _count: { select: { customers: { where: { isDeleted: false } } } } },
      orderBy: { order: 'asc' },
    });
    reply.send({ success: true, data: categories });
  });

  app.post('/categories', { preHandler: [requireRole('ADMIN'), validateBody(createCustomerCategorySchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createCustomerCategorySchema>;
    const maxOrder = await prisma.customerCategory.aggregate({ _max: { order: true } });
    const order = (maxOrder._max.order ?? 0) + 1;
    const category = await prisma.customerCategory.create({ data: { name: body.name, order } });
    reply.status(201).send({ success: true, data: category });
  });

  app.patch('/categories/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(createCustomerCategorySchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof createCustomerCategorySchema>;
    const existing = await prisma.customerCategory.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND');
    const category = await prisma.customerCategory.update({ where: { id }, data: { name: body.name } });
    reply.send({ success: true, data: category });
  });

  app.delete('/categories/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.customerCategory.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND');
    // Unlink customers from this category before deleting
    await prisma.customer.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.customerCategory.delete({ where: { id } });
    reply.send({ success: true, data: null });
  });

  // ── Customers CRUD ──
  app.get('/', { preHandler: [requireAuth, validateQuery(customerListQuery)] }, async (request, reply) => {
    const query = request.query as z.infer<typeof customerListQuery>;
    const result = await customerService.listCustomers(query);
    reply.send({ success: true, ...result });
  });

  app.get('/:id', { preHandler: [requireAuth, validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await customerService.getCustomer(id);
    reply.send({ success: true, data: customer });
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createCustomerSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createCustomerSchema>;
    const customer = await customerService.createCustomer(body, request.userId);
    reply.status(201).send({ success: true, data: customer });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateCustomerSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateCustomerSchema>;
    const customer = await customerService.updateCustomer(id, body, request.userId);
    reply.send({ success: true, data: customer });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await customerService.softDeleteCustomer(id, request.userId);
    reply.send({ success: true, data: null });
  });
}
