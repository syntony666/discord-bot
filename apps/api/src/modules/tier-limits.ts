import type { PrismaClient } from '../.prisma/client';
import type { LimitFeature, TierLimitData } from '@discord-bot/shared';
import { ApiError } from '@discord-bot/shared';

export const DEFAULT_TIER_LIMITS = {
  NORMAL: { streamWatchers: 3, keywordRules: 20, reactionRolePanels: 3 },
  PREMIUM: { streamWatchers: 10, keywordRules: 100, reactionRolePanels: 10 },
  HOME: { streamWatchers: -1, keywordRules: -1, reactionRolePanels: -1 },
} as const;

type LimitValues = Pick<TierLimitData, 'streamWatchers' | 'keywordRules' | 'reactionRolePanels'>;

/** Resolves the effective limits for a guild: DB row, else built-in defaults. */
export async function getGuildLimits(
  prisma: PrismaClient,
  guildId: string
): Promise<LimitValues | null> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { tier: true },
  });
  if (!guild) return null;
  const row = await prisma.tierLimit.findUnique({ where: { tier: guild.tier } });
  return row ?? DEFAULT_TIER_LIMITS[guild.tier];
}

/** Throws 403 LIMIT_EXCEEDED when `current` reaches `max`; -1 means unlimited. */
export function assertWithinLimit(
  max: number,
  current: number,
  label: string
): asserts max is number {
  if (max >= 0 && current >= max) {
    throw new ApiError(403, `此伺服器的${label}已達上限(${max} 個)`, 'LIMIT_EXCEEDED');
  }
}

export async function assertGuildFeatureLimit(
  prisma: PrismaClient,
  guildId: string,
  feature: LimitFeature,
  current: number,
  label: string
) {
  const limits = await getGuildLimits(prisma, guildId);
  if (!limits) return;
  assertWithinLimit(limits[feature], current, label);
}
