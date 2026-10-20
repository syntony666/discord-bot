import { isUnlimitedLimit } from '@discord-bot/shared';

export const TIER_ICON: Record<string, string> = { NORMAL: '⚪', PREMIUM: '🟣', HOME: '🟡' };

export const tierName = (tier: string) => `${TIER_ICON[tier] ?? ''} ${tier}`;

export const formatUsage = (count: number, limit: number) =>
  `${count}/${isUnlimitedLimit(limit) ? '∞' : limit}`;
