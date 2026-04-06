import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis error');
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
    });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export default getRedis;
