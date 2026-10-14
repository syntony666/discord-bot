import type { GuildTier } from './enums';

export interface GuildData {
  id: string;
  name: string;
  tier: GuildTier;
  createdAt: string;
}

export interface TierLimitData {
  tier: GuildTier;
  streamWatchers: number;
  keywordRules: number;
  reactionRolePanels: number;
}

export interface GuildCounts {
  streamWatchers: number;
  keywordRules: number;
  reactionRolePanels: number;
}

export interface GuildFeatures {
  memberJoin: boolean;
  memberLeave: boolean;
  streamNotify: boolean;
}

export interface GuildDetail extends GuildData {
  limits: Pick<TierLimitData, 'streamWatchers' | 'keywordRules' | 'reactionRolePanels'>;
  counts: GuildCounts;
  features: GuildFeatures;
}

export interface BotStateEntry {
  key: string;
  value: string;
}

export interface BotStats {
  guilds: number;
  tierCounts: Record<string, number>;
  watchers: number;
  liveWatchers: number;
  keywordRules: number;
  reactionRolePanels: number;
  limits: TierLimitData[];
}
