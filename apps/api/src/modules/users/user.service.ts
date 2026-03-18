import { prisma } from '../../config/database.js';
import { notFound, conflict } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';
import { hashPassword } from '../auth/auth.service.js';
import type { CreateUserInput, UpdateUserInput } from '@sardorbek/shared';

export async function listUsers() {
  return prisma.user.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      phone: true,
      avatar: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(input: CreateUserInput, adminId: string) {
  const existing = await prisma.user.findFirst({
    where: { login: input.login, isDeleted: false },
  });
  if (existing) throw conflict('USER_LOGIN_EXISTS');

  const hashed = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      login: input.login,
      password: hashed,
      name: input.name,
      role: input.role,
      phone: input.phone,
    },
    select: {
      id: true, login: true, name: true, role: true,
      phone: true, isActive: true, createdAt: true,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    userId: adminId,
    newData: { login: input.login, name: input.name, role: input.role },
  });

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, adminId: string) {
  const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('USER_NOT_FOUND');

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: {
      id: true, login: true, name: true, role: true,
      phone: true, isActive: true, createdAt: true,
    },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'User',
    entityId: id,
    userId: adminId,
    oldData: { name: existing.name, role: existing.role },
    newData: input as Record<string, unknown>,
  });

  return user;
}

export async function softDeleteUser(id: string, adminId: string) {
  const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('USER_NOT_FOUND');

  // Admin o'zini o'chira olmaydi
  if (id === adminId) throw conflict('CANNOT_DELETE_SELF');

  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    action: 'SOFT_DELETE',
    entity: 'User',
    entityId: id,
    userId: adminId,
    oldData: { name: existing.name },
  });
}

export async function resetPassword(id: string, newPassword: string, adminId: string) {
  const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw notFound('USER_NOT_FOUND');

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id },
    data: { password: hashed },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'User',
    entityId: id,
    userId: adminId,
    newData: { passwordReset: true },
  });
}
