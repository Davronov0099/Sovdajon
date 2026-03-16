import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@sardorbek/shared';
import { requireAuth } from '../../plugins/auth.js';
import { validateBody } from '../../plugins/validate.js';
import { LOGIN_RATE_LIMIT } from '../../plugins/rateLimit.js';
import * as handler from './auth.handler.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/login
  app.post(
    '/login',
    {
      preHandler: [validateBody(loginSchema)],
      ...LOGIN_RATE_LIMIT,
    },
    handler.loginHandler,
  );

  // POST /api/v1/auth/refresh
  app.post('/refresh', handler.refreshHandler);

  // POST /api/v1/auth/logout
  app.post(
    '/logout',
    { preHandler: [requireAuth] },
    handler.logoutHandler,
  );

  // GET /api/v1/auth/me
  app.get(
    '/me',
    { preHandler: [requireAuth] },
    handler.meHandler,
  );
}
