import { PrismaClient } from '../.prisma/client';
import type { AutoFeatureType } from '@discord-bot/shared';

export function createAutoModule(prisma: PrismaClient) {
  return {
    getFeature(guildId: string, feature: AutoFeatureType) {
      return prisma.autoFeature.findUnique({
        where: { guildId_feature: { guildId, feature } },
      });
    },

    setFeature(guildId: string, feature: AutoFeatureType, enabled: boolean) {
      return prisma.autoFeature.upsert({
        where: { guildId_feature: { guildId, feature } },
        create: { guildId, feature, enabled },
        update: { enabled },
      });
    },
  };
}

export type AutoModule = ReturnType<typeof createAutoModule>;
