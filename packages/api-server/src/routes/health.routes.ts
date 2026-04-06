import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getRedis } from '../utils/redis';
import logger from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Detailed health check
router.get('/detailed', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  
  // Check database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    checks.database = { status: 'error', error: 'Connection failed' };
  }
  
  // Check Redis
  try {
    const start = Date.now();
    const redis = getRedis();
    await redis.ping();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    logger.error({ err }, 'Redis health check failed');
    checks.redis = { status: 'error', error: 'Connection failed' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
  });
});

// Ready check for kubernetes
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { ready: true } });
  } catch {
    res.status(503).json({ success: false, error: { message: 'Not ready' } });
  }
});

// Live check for kubernetes
router.get('/live', (_req: Request, res: Response) => {
  res.json({ success: true, data: { live: true } });
});

export default router;
