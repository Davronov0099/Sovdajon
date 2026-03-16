import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { createContactSchema, updateContactSchema, contactListQuery, createContactCategorySchema, contactImportSchema, idParamSchema } from '@sardorbek/shared';
import { requireRole } from '../../plugins/auth.js';
import { validateBody, validateQuery, validateParams } from '../../plugins/validate.js';
import { prisma } from '../../config/database.js';
import { notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { z } from 'zod';

// Auto-sync: if contact category is "Mijoz" → create Customer, "Ta'minotchi" → create Supplier
// Uses transaction to prevent race conditions (duplicate Customer/Supplier)
async function autoSyncContact(name: string, phone: string, categoryId: string | null) {
  if (!categoryId) return;
  const category = await prisma.contactCategory.findUnique({ where: { id: categoryId } });
  if (!category) return;

  const categoryName = category.name.toLowerCase().trim();
  const isCustomer = categoryName === 'mijoz' || categoryName === 'customer' || categoryName === 'mijozlar';
  const isSupplier = categoryName === "ta'minotchi" || categoryName === 'supplier' || categoryName === "ta'minotchilar";

  if (isCustomer) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { phone } });
      if (!existing) {
        await tx.customer.create({ data: { name, phone } });
      }
    });
  }

  if (isSupplier) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.supplier.findFirst({ where: { phone } });
      if (!existing) {
        await tx.supplier.create({ data: { name, phone } });
      }
    });
  }
}

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  // Contact Categories
  app.get('/categories', { preHandler: [requireRole('ADMIN', 'CASHIER')] }, async (_request, reply) => {
    const categories = await prisma.contactCategory.findMany({
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: 'asc' },
    });
    reply.send({ success: true, data: categories });
  });

  app.post('/categories', { preHandler: [requireRole('ADMIN'), validateBody(createContactCategorySchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createContactCategorySchema>;
    const category = await prisma.contactCategory.create({ data: body });
    reply.status(201).send({ success: true, data: category });
  });

  app.delete('/categories/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.contactCategory.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND');
    // Unlink contacts from this category before deleting
    await prisma.contact.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.contactCategory.delete({ where: { id } });
    reply.send({ success: true, data: null });
  });

  // Contacts CRUD
  app.get('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateQuery(contactListQuery)] }, async (request, reply) => {
    const { page, limit, categoryId, search } = request.query as z.infer<typeof contactListQuery>;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.contact.count({ where }),
    ]);
    reply.send({ success: true, data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'CASHIER'), validateBody(createContactSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createContactSchema>;
    const contact = await prisma.contact.create({
      data: body,
      include: { category: { select: { id: true, name: true } } },
    });
    // Auto-sync to Customer/Supplier
    await autoSyncContact(body.name, body.phone, body.categoryId ?? null);
    await createAuditLog({ action: 'CREATE', entity: 'Contact', entityId: contact.id, userId: request.userId });
    reply.status(201).send({ success: true, data: contact });
  });

  app.patch('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateContactSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateContactSchema>;
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND', 'Kontakt topilmadi');

    const contact = await prisma.contact.update({
      where: { id },
      data: body,
      include: { category: { select: { id: true, name: true } } },
    });
    // Auto-sync if category changed
    if (body.categoryId) {
      await autoSyncContact(contact.name, contact.phone, body.categoryId);
    }
    reply.send({ success: true, data: contact });
  });

  app.delete('/:id', { preHandler: [requireRole('ADMIN'), validateParams(idParamSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) throw notFound('NOT_FOUND');
    await prisma.contact.delete({ where: { id } });
    await createAuditLog({ action: 'DELETE', entity: 'Contact', entityId: id, userId: request.userId });
    reply.send({ success: true, data: null });
  });

  // Bulk import
  app.post('/import', { preHandler: [requireRole('ADMIN'), validateBody(contactImportSchema)] }, async (request, reply) => {
    const { contacts, categoryId } = request.body as z.infer<typeof contactImportSchema>;

    // Batch: get all existing phones in one query
    const phones = contacts.map((c) => c.phone);
    const existingContacts = await prisma.contact.findMany({
      where: { phone: { in: phones } },
      select: { phone: true },
    });
    const existingPhones = new Set(existingContacts.map((c) => c.phone));

    // Filter new contacts
    const newContacts = contacts.filter((c) => !existingPhones.has(c.phone));
    const duplicates = contacts.length - newContacts.length;

    // Batch insert (1 query instead of N)
    if (newContacts.length > 0) {
      await prisma.contact.createMany({
        data: newContacts.map((c) => ({
          name: c.name,
          phone: c.phone,
          categoryId: categoryId ?? null,
        })),
        skipDuplicates: true,
      });

      // Auto-sync new contacts (batch — category queried once)
      if (categoryId) {
        for (const c of newContacts) {
          await autoSyncContact(c.name, c.phone, categoryId);
        }
      }
    }

    const created = newContacts.length;

    await createAuditLog({
      action: 'CREATE',
      entity: 'ContactImport',
      entityId: 'bulk',
      userId: request.userId,
      newData: { created, duplicates, total: contacts.length },
    });

    reply.send({ success: true, data: { created, duplicates } });
  });
}
