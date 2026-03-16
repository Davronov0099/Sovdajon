import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';
import { validationError } from '../utils/errors.js';

/**
 * Prehandler factory: validate request body with Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      throw zodToAppError(result.error);
    }
    (request.body as T) = result.data;
  };
}

/**
 * Prehandler factory: validate query params with Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      throw zodToAppError(result.error);
    }
    (request.query as T) = result.data;
  };
}

/**
 * Prehandler factory: validate URL params with Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      throw zodToAppError(result.error);
    }
    (request.params as T) = result.data;
  };
}

function zodToAppError(error: ZodError) {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return validationError(details);
}
