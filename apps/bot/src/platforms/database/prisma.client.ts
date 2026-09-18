import { PrismaClient } from '@prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Transitional client — removed in the next step once all modules call the API.

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

export async function connectPrisma() {
  await prisma.$connect();
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
