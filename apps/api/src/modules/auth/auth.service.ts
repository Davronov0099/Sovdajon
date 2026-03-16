import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { JwtPayload, AuthTokens } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  storeRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  revokeAllUserTokens,
  blacklistToken,
} from '../../config/redis.js';
import { unauthorized } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

function generateTokens(userId: string, role: string, family: string): AuthTokens {
  // env returns string — cast to expected jwt type
  const accessOpts = { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions;
  const refreshOpts = { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions;

  const accessToken = jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, accessOpts);
  const refreshToken = jwt.sign({ userId, role, family }, env.JWT_REFRESH_SECRET, refreshOpts);

  return { accessToken, refreshToken };
}

export async function login(loginInput: string, password: string): Promise<AuthTokens> {
  const user = await prisma.user.findFirst({
    where: { login: loginInput },
  });

  if (!user) {
    throw unauthorized('AUTH_INVALID_CREDENTIALS');
  }

  if (user.isDeleted) {
    throw unauthorized('AUTH_USER_DELETED');
  }

  if (!user.isActive) {
    throw unauthorized('AUTH_USER_INACTIVE');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw unauthorized('AUTH_INVALID_CREDENTIALS');
  }

  const family = randomUUID();
  const tokens = generateTokens(user.id, user.role, family);

  // Store refresh token family in Redis
  await storeRefreshToken(user.id, family, REFRESH_TOKEN_TTL);

  await createAuditLog({
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    userId: user.id,
  });

  return tokens;
}

export async function refresh(
  refreshTokenStr: string,
): Promise<AuthTokens> {
  let payload: JwtPayload & { family: string };

  try {
    payload = jwt.verify(refreshTokenStr, env.JWT_REFRESH_SECRET) as JwtPayload & {
      family: string;
    };
  } catch {
    throw unauthorized('AUTH_REFRESH_TOKEN_INVALID');
  }

  // Check if this refresh token family is still valid (not revoked)
  const valid = await isRefreshTokenValid(payload.userId, payload.family);
  if (!valid) {
    // Token reuse detected — revoke ALL user sessions (security)
    await revokeAllUserTokens(payload.userId);
    throw unauthorized('AUTH_REFRESH_TOKEN_REUSED');
  }

  // Rotate: revoke old family, create new one
  await revokeRefreshToken(payload.userId, payload.family);

  const newFamily = randomUUID();
  const tokens = generateTokens(payload.userId, payload.role, newFamily);
  await storeRefreshToken(payload.userId, newFamily, REFRESH_TOKEN_TTL);

  return tokens;
}

export async function logout(userId: string, accessToken: string): Promise<void> {
  // Blacklist current access token (for its remaining TTL)
  try {
    const decoded = jwt.decode(accessToken) as JwtPayload | null;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await blacklistToken(accessToken, ttl);
      }
    }
  } catch {
    // Ignore decode errors — token may already be invalid
  }

  // Revoke all refresh tokens for this user
  await revokeAllUserTokens(userId);

  await createAuditLog({
    action: 'LOGOUT',
    entity: 'User',
    entityId: userId,
    userId,
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      phone: true,
      avatar: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw unauthorized('AUTH_TOKEN_INVALID');
  }

  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
