import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LoginInput } from '@sardorbek/shared';
import * as authService from './auth.service.js';

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
): Promise<void> {
  const { login, password } = request.body;
  const tokens = await authService.login(login, password);

  // Set refresh token as httpOnly cookie
  reply.setCookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  reply.send({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const refreshToken = request.cookies.refreshToken;
  if (!refreshToken) {
    reply.status(401).send({
      success: false,
      error: { code: 'AUTH_REFRESH_TOKEN_INVALID', message: 'No refresh token' },
    });
    return;
  }

  const tokens = await authService.refresh(refreshToken);

  reply.setCookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  });

  reply.send({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = request.headers.authorization?.slice(7) ?? '';
  await authService.logout(request.userId, token);

  reply.clearCookie('refreshToken', {
    path: '/api/v1/auth/refresh',
  });

  reply.send({ success: true, data: null });
}

export async function meHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await authService.getMe(request.userId);
  reply.send({ success: true, data: user });
}
