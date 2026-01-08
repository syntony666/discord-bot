import { PrismaClient } from '@prisma-client/client';
import { createLogger } from '@core/logger';
import { PrismaPg } from '@prisma/adapter-pg';

const log = createLogger('Prisma');

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// 監聽 Prisma 警告和錯誤
prisma.$on('warn', (e) => {
  log.warn({ message: e.message, target: e.target }, 'Prisma warning');
});

prisma.$on('error', (e) => {
  log.error({ message: e.message, target: e.target }, 'Prisma error');
});

export async function connectPrisma() {
  try {
    log.info('Connecting to database...');
    await prisma.$connect();
    log.info('Database connected successfully');
  } catch (error) {
    log.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    log.info('Database disconnected');
  } catch (error) {
    log.error({ error }, 'Error disconnecting from database');
  }
}
