import { PrismaClient } from '../.prisma/client';
import type { CreateKeywordRuleInput, UpdateKeywordRuleInput } from '@discord-bot/shared';

const keywordRuntimeSelect = {
  guildId: true,
  pattern: true,
  matchType: true,
  response: true,
  enabled: true,
} as const;

export function createKeywordModule(prisma: PrismaClient) {
  return {
    getRulesByGuild(guildId: string) {
      return prisma.keywordRule.findMany({
        where: { guildId, enabled: true },
        orderBy: { createdAt: 'desc' },
        select: keywordRuntimeSelect,
      });
    },

    getRulesForList(guildId: string) {
      return prisma.keywordRule.findMany({
        where: { guildId, enabled: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    searchRules(guildId: string, query: string) {
      return prisma.keywordRule.findMany({
        where: {
          guildId,
          enabled: true,
          pattern: { contains: query, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    getRuleByPattern(guildId: string, pattern: string) {
      return prisma.keywordRule.findUnique({
        where: { guildId_pattern: { guildId, pattern } },
      });
    },

    createRule(input: CreateKeywordRuleInput) {
      return prisma.keywordRule.create({
        data: {
          guildId: input.guildId,
          pattern: input.pattern,
          matchType: input.matchType,
          response: input.response,
          editorId: input.editorId,
          enabled: input.enabled ?? true,
        },
      });
    },

    updateRule(input: UpdateKeywordRuleInput) {
      return prisma.keywordRule.update({
        where: { guildId_pattern: { guildId: input.guildId, pattern: input.pattern } },
        data: {
          response: input.response,
          editorId: input.editorId,
          ...(input.matchType !== undefined && { matchType: input.matchType }),
        },
      });
    },

    async deleteRule(guildId: string, pattern: string) {
      await prisma.keywordRule.delete({
        where: { guildId_pattern: { guildId, pattern } },
      });
    },
  };
}

export type KeywordModule = ReturnType<typeof createKeywordModule>;
