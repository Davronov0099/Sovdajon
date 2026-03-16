import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { redis } from '../config/redis.js';

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => {
      // Use userId for authenticated endpoints, IP for anonymous
      return request.userId || request.ip;
    },
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests — please wait',
      },
    }),
  });
}

// Endpoint-specific rate limit configs
export const LOGIN_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
    },
  },
};

export const UPLOAD_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: '1 minute',
    },
  },
};

export const EXPORT_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '5 minutes',
    },
  },
};

export const BACKUP_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 1,
      timeWindow: '1 hour',
    },
  },
};
