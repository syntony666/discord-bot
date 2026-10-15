import { PrismaClient } from '../.prisma/client';

export function createBotStateModule(prisma: PrismaClient) {
  return {
    get(key: string) {
      return prisma.botState.findUnique({ where: { key } });
    },

    set(key: string, value: string) {
      return prisma.botState.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    },
  };
}

export type BotStateModule = ReturnType<typeof createBotStateModule>;
