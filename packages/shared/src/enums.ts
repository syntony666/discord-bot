export const KeywordMatchType = {
  EXACT: 'EXACT',
  CONTAINS: 'CONTAINS',
} as const;
export type KeywordMatchType = (typeof KeywordMatchType)[keyof typeof KeywordMatchType];

export const NotificationType = {
  MEMBER_JOIN: 'MEMBER_JOIN',
  MEMBER_LEAVE: 'MEMBER_LEAVE',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ReactionRoleMode = {
  NORMAL: 'NORMAL',
  UNIQUE: 'UNIQUE',
  VERIFY: 'VERIFY',
} as const;
export type ReactionRoleMode = (typeof ReactionRoleMode)[keyof typeof ReactionRoleMode];

export const StreamPlatform = {
  TWITCH: 'TWITCH',
} as const;
export type StreamPlatform = (typeof StreamPlatform)[keyof typeof StreamPlatform];

export const GuildTier = {
  NORMAL: 'NORMAL',
  PREMIUM: 'PREMIUM',
  HOME: 'HOME',
} as const;
export type GuildTier = (typeof GuildTier)[keyof typeof GuildTier];

export const LimitFeature = {
  streamWatchers: 'streamWatchers',
  keywordRules: 'keywordRules',
  reactionRolePanels: 'reactionRolePanels',
} as const;
export type LimitFeature = (typeof LimitFeature)[keyof typeof LimitFeature];

export function isEnumValue<E extends Record<string, string>>(e: E, v: unknown): v is E[keyof E] {
  return typeof v === 'string' && Object.values(e).includes(v);
}
