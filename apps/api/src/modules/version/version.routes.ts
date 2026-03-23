import type { FastifyInstance } from 'fastify';

// Build vaqtida generatsiya — pm2 restart bo'lganda o'zgaradi
const BUILD_VERSION = Date.now().toString(36);

// SSE ulanganlarni kuzatish (graceful shutdown uchun)
const clients = new Set<{ raw: import('stream').Writable }>();

export async function versionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/version — oddiy versiya
  app.get('/', async () => ({ version: BUILD_VERSION }));

  // GET /api/v1/version/stream — SSE real-time
  app.get('/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx buffering o'chirish
    });

    // Darhol versiyani yuborish
    reply.raw.write(`data: ${JSON.stringify({ version: BUILD_VERSION })}\n\n`);

    clients.add(reply);

    // Heartbeat — ulanishni tirik saqlash (har 30s)
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30_000);

    // Client uzilganda tozalash
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(reply);
    });
  });
}
