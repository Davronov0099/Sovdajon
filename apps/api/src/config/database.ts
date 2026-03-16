import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const SOFT_DELETE_MODELS = ['Product', 'Customer', 'User', 'Supplier'] as const;
type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return model !== undefined && (SOFT_DELETE_MODELS as readonly string[]).includes(model);
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasourceUrl: env.DATABASE_URL,
  });

  // Soft delete via Prisma Client Extension ($extends)
  const extended = client.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isSoftDeleteModel(model) && (args.where as Record<string, unknown>)?.isDeleted === undefined) {
            (args.where as Record<string, unknown>) = { ...args.where, isDeleted: false };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isSoftDeleteModel(model) && (args.where as Record<string, unknown>)?.isDeleted === undefined) {
            (args.where as Record<string, unknown>) = { ...args.where, isDeleted: false };
          }
          return query(args);
        },
        async findUnique({ args, query }) {
          // findUnique can't filter by non-unique fields — just pass through
          // Services should use findFirst for soft-deleted models when filtering needed
          return query(args);
        },
        async count({ model, args, query }) {
          if (isSoftDeleteModel(model) && (args.where as Record<string, unknown>)?.isDeleted === undefined) {
            (args.where as Record<string, unknown>) = { ...args.where, isDeleted: false };
          }
          return query(args);
        },
      },
    },
  });

  return extended as unknown as PrismaClient;
}

export const prisma = createPrismaClient();

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
