import { PrismaClient } from '@prisma-client/client';
import { createLogger } from '@core/logger';
import { PrismaPg } from '@prisma/adapter-pg';

const log = createLogger('Prisma');

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

export async function connectPrisma() {
  log.info('Connecting to database...');
  await prisma.$connect();
  log.info('Database connected');
}
