import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
  }
}

export async function requestLogPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest('requestId', '');
  app.decorateRequest('startTime', 0);

  // Assign request ID and start time
  app.addHook('onRequest', async (request) => {
    request.requestId = (request.headers['x-request-id'] as string) || randomUUID();
    request.startTime = Date.now();
  });

  // Log response
  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.startTime;
    const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';

    app.log[level]({
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      userId: request.userId || undefined,
      userAgent: request.headers['user-agent']?.slice(0, 100),
    });
  });

  // Add request ID to response headers
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-ID', request.requestId);
  });
}
