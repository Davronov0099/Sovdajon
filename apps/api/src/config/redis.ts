import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  lazyConnect: true,
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

// Token blacklist helpers
const TOKEN_BLACKLIST_PREFIX = 'blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:';

export async function blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
  await redis.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, '1', 'EX', expiresInSeconds);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
  return result !== null;
}

export async function storeRefreshToken(
  userId: string,
  tokenFamily: string,
  expiresInSeconds: number,
): Promise<void> {
  await redis.set(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`, '1', 'EX', expiresInSeconds);
}

export async function isRefreshTokenValid(userId: string, tokenFamily: string): Promise<boolean> {
  const result = await redis.get(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`);
  return result !== null;
}

export async function revokeRefreshToken(userId: string, tokenFamily: string): Promise<void> {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  // SCAN instead of KEYS — O(1) per iteration, non-blocking in production
  const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(Number(cursor), 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
