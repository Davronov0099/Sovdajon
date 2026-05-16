import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { join, extname } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { env } from '../config/env.js';
import { requireAuth } from '../plugins/auth.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  });

  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' });
    }

    const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const ext = extname(file.filename) || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(uploadDir, filename);

    await pipeline(file.file, createWriteStream(filepath));

    if (file.file.truncated) {
      const { unlinkSync } = await import('fs');
      unlinkSync(filepath);
      return reply.status(400).send({ error: 'File too large. Max 5MB' });
    }

    return { url: `/uploads/${filename}` };
  });

  // Multiple images upload
  app.post('/images', { preHandler: [requireAuth] }, async (request, reply) => {
    const parts = request.files();
    const urls: string[] = [];

    const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    for await (const file of parts) {
      if (!ALLOWED_TYPES.includes(file.mimetype)) continue;

      const ext = extname(file.filename) || '.jpg';
      const filename = `${randomUUID()}${ext}`;
      const filepath = join(uploadDir, filename);

      await pipeline(file.file, createWriteStream(filepath));

      if (file.file.truncated) {
        const { unlinkSync } = await import('fs');
        unlinkSync(filepath);
        continue;
      }

      urls.push(`/uploads/${filename}`);
      if (urls.length >= 8) break;
    }

    if (urls.length === 0) {
      return reply.status(400).send({ success: false, error: 'No valid images uploaded' });
    }

    return { success: true, data: { urls } };
  });
}
