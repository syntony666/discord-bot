import { PrismaClient } from '../.prisma/client';
import { assertGuildFeatureLimit } from './tier-limits';
import type {
  CreateStreamNotifyConfigInput,
  CreateStreamWatcherInput,
  StreamPlatform,
  UpdateStreamNotifyConfigInput,
} from '@discord-bot/shared';

export interface StreamWatcherPatch {
  isLive?: boolean;
  platformUserId?: string;
  avatarImageUrl?: string;
}

export function createStreamNotifyModule(prisma: PrismaClient) {
  return {
    getConfig(guildId: string) {
      return prisma.streamNotifyConfig.findUnique({ where: { guildId } });
    },

    createConfig(input: CreateStreamNotifyConfigInput) {
      return prisma.streamNotifyConfig.create({
        data: {
          guildId: input.guildId,
          channelId: input.channelId,
          message: input.message || '',
        },
      });
    },

    updateConfig(guildId: string, data: UpdateStreamNotifyConfigInput) {
      return prisma.streamNotifyConfig.update({ where: { guildId }, data });
    },

    async deleteConfig(guildId: string) {
      await prisma.streamNotifyConfig.delete({ where: { guildId } });
    },

    getWatchers(guildId: string) {
      return prisma.streamWatcher.findMany({
        where: { guildId },
        orderBy: { createdAt: 'asc' },
      });
    },

    getAllWatchers() {
      return prisma.streamWatcher.findMany({ orderBy: { createdAt: 'asc' } });
    },

    getWatcher(guildId: string, platform: StreamPlatform, platformId: string) {
      return prisma.streamWatcher.findUnique({
        where: { guildId_platform_platformId: { guildId, platform, platformId } },
      });
    },

    async addWatcher(input: CreateStreamWatcherInput) {
      const count = await prisma.streamWatcher.count({ where: { guildId: input.guildId } });
      await assertGuildFeatureLimit(prisma, input.guildId, 'streamWatchers', count, '實況監控');
      return prisma.streamWatcher.create({
        data: {
          guildId: input.guildId,
          platform: input.platform,
          platformId: input.platformId,
          platformUserId: input.platformUserId,
          displayName: input.displayName,
          avatarImageUrl: input.avatarImageUrl,
        },
      });
    },

    async removeWatcher(guildId: string, platform: StreamPlatform, platformId: string) {
      await prisma.streamWatcher.delete({
        where: { guildId_platform_platformId: { guildId, platform, platformId } },
      });
    },

    updateWatcher(id: string, patch: StreamWatcherPatch) {
      return prisma.streamWatcher.update({
        where: { id },
        data: {
          ...(patch.isLive !== undefined && { isLive: patch.isLive }),
          ...(patch.platformUserId !== undefined && { platformUserId: patch.platformUserId }),
          ...(patch.avatarImageUrl !== undefined && { avatarImageUrl: patch.avatarImageUrl }),
        },
      });
    },
  };
}

export type StreamNotifyModule = ReturnType<typeof createStreamNotifyModule>;
