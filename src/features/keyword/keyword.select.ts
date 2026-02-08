import { Prisma, KeywordRule } from '@prisma-client/client';

export const keywordRuntimeSelect = {
  guildId: true,
  pattern: true,
  matchType: true,
  response: true,
  enabled: true,
} as const satisfies Prisma.KeywordRuleSelect;

export type KeywordRuntime = Prisma.KeywordRuleGetPayload<{
  select: typeof keywordRuntimeSelect;
}>;

export type { KeywordRule };
