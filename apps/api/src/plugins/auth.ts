import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { JwtPayload, Role } from '@sardorbek/shared';
import { env } from '../config/env.js';
import { isTokenBlacklisted } from '../config/redis.js';
import { unauthorized, forbidden } from '../utils/errors.js';

// Extend Fastify request
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: Role;
  }
}

export async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest('userId', '');
  app.decorateRequest('userRole', 'HELPER');
}

/**
 * Prehandler: verify JWT access token
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorized('AUTH_TOKEN_MISSING');
  }

  const token = authHeader.slice(7);

  // Check blacklist
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    throw unauthorized('AUTH_TOKEN_INVALID');
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    request.userId = payload.userId;
    request.userRole = payload.role;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorized('AUTH_TOKEN_EXPIRED');
    }
    throw unauthorized('AUTH_TOKEN_INVALID');
  }
}

/**
 * Prehandler factory: require specific role(s)
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await requireAuth(request, _reply);
    if (!roles.includes(request.userRole)) {
      throw forbidden('AUTH_FORBIDDEN');
    }
  };
}
