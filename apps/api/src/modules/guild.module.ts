import { PrismaClient } from '../.prisma/client';
import type { GuildTier, LimitFeature } from '@discord-bot/shared';
import { DEFAULT_TIER_LIMITS } from './tier-limits';

const TIER_ORDER: GuildTier[] = ['NORMAL', 'PREMIUM', 'HOME'];

export function createGuildModule(prisma: PrismaClient) {
  const listTierLimits = async () => {
    const rows = await prisma.tierLimit.findMany();
    return TIER_ORDER.map((tier) => ({
      tier,
      ...(rows.find((r) => r.tier === tier) ?? DEFAULT_TIER_LIMITS[tier]),
    }));
  };

  return {
    ensureGuild(guildId: string, guildName?: string) {
      return prisma.guild.upsert({
        where: { id: guildId },
        update: {
          ...(guildName && { name: guildName }),
        },
        create: {
          id: guildId,
          name: guildName || `Guild ${guildId}`,
        },
      });
    },

    async getGuild(guildId: string) {
      const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: {
          _count: {
            select: {
              streamWatchers: true,
              keywordRules: true,
              reactionRolePanels: true,
            },
          },
          notificationChannels: { select: { type: true, enabled: true } },
          streamNotifyConfig: { select: { enabled: true } },
        },
      });
      if (!guild) return null;
      const row = await prisma.tierLimit.findUnique({ where: { tier: guild.tier } });
      const limits = row ?? DEFAULT_TIER_LIMITS[guild.tier];
      const channelEnabled = (type: string) =>
        guild.notificationChannels.some((c) => c.type === type && c.enabled);
      return {
        id: guild.id,
        name: guild.name,
        tier: guild.tier,
        createdAt: guild.createdAt,
        limits,
        counts: guild._count,
        features: {
          memberJoin: channelEnabled('MEMBER_JOIN'),
          memberLeave: channelEnabled('MEMBER_LEAVE'),
          streamNotify: guild.streamNotifyConfig?.enabled ?? false,
        },
      };
    },

    async setTier(guildId: string, tier: GuildTier) {
      if (tier === 'HOME') {
        const [, guild] = await prisma.$transaction([
          prisma.guild.updateMany({
            where: { tier: 'HOME', id: { not: guildId } },
            data: { tier: 'NORMAL' },
          }),
          prisma.guild.update({ where: { id: guildId }, data: { tier } }),
        ]);
        return guild;
      }
      return prisma.guild.update({ where: { id: guildId }, data: { tier } });
    },

    async deleteGuild(guildId: string) {
      await prisma.guild.delete({ where: { id: guildId } });
    },

    listGuilds() {
      return prisma.guild.findMany({ orderBy: { createdAt: 'desc' } });
    },

    listTierLimits,

    async getStats() {
      const [guilds, tierGroups, watchers, liveWatchers, keywordRules, reactionRolePanels] =
        await Promise.all([
          prisma.guild.count(),
          prisma.guild.groupBy({ by: ['tier'], _count: { _all: true } }),
          prisma.streamWatcher.count(),
          prisma.streamWatcher.count({ where: { isLive: true } }),
          prisma.keywordRule.count(),
          prisma.reactionRolePanel.count(),
        ]);
      const tierCounts = Object.fromEntries(
        TIER_ORDER.map((tier) => [tier, tierGroups.find((g) => g.tier === tier)?._count._all ?? 0])
      );
      return {
        guilds,
        tierCounts,
        watchers,
        liveWatchers,
        keywordRules,
        reactionRolePanels,
        limits: await listTierLimits(),
      };
    },

    setTierLimit(tier: GuildTier, patch: Partial<Record<LimitFeature, number>>) {
      const defaults = DEFAULT_TIER_LIMITS[tier];
      return prisma.tierLimit.upsert({
        where: { tier },
        update: patch,
        create: { tier, ...defaults, ...patch },
      });
    },
  };
}

export type GuildModule = ReturnType<typeof createGuildModule>;
