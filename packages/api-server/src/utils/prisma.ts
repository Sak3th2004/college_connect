import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import logger from '../utils/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: config.nodeEnv === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting Prisma...');
  await prisma.$disconnect();
});

export default prisma;
