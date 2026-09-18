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
