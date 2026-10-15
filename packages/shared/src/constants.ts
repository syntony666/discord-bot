export const KEYWORD_RESPONSE_SEPARATOR = ';;';

export const splitKeywordResponse = (response: string): string[] =>
  response.split(KEYWORD_RESPONSE_SEPARATOR).filter((p) => p.length > 0);

// Mirrors the @default values on MemberNotifyMessage in schema.prisma.
export const DEFAULT_MEMBER_MESSAGES = {
  join: '📥 {user} 加入了 {server}！目前共 {memberCount} 位成員',
  leave: '📤 {username} 離開了 {server}。目前剩餘 {memberCount} 位成員',
} as const;

/** Tier-limit sentinel meaning "no cap"; the minimum PATCH accepts. */
export const UNLIMITED_LIMIT = -1;
export const isUnlimitedLimit = (n: number) => n <= UNLIMITED_LIMIT;
