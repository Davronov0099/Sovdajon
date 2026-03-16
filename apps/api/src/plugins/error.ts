import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export async function errorPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, _request, reply) => {
    // AppError — our custom errors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Zod validation error
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) details[path] = [];
        details[path]!.push(issue.message);
      }
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation error', details },
      });
    }

    const fastifyError = error as FastifyError;

    // Fastify validation error (JSON schema)
    if (fastifyError.validation) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: fastifyError.message },
      });
    }

    // Rate limit error
    if (fastifyError.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
      });
    }

    // Unknown error
    app.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? fastifyError.message
            : 'Internal server error',
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
}
