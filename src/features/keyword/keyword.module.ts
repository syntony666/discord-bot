import { PrismaClient, KeywordMatchType, type KeywordRule } from '@prisma-client/client';
import { Observable, from } from 'rxjs';

export interface CreateKeywordRuleInput {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType; // 'EXACT' | 'CONTAINS'
  response: string;
  enabled?: boolean;
}

export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRule[]>;
  createRule$(input: CreateKeywordRuleInput): Observable<KeywordRule>;
  deleteRule$(guildId: string, pattern: string): Observable<void>;
}

export function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    getRulesByGuild$(guildId: string): Observable<KeywordRule[]> {
      return from(
        prisma.keywordRule.findMany({
          where: { guildId, enabled: true },
        })
      );
    },

    createRule$(input: CreateKeywordRuleInput): Observable<KeywordRule> {
      return from(
        prisma.keywordRule.create({
          data: {
            guildId: input.guildId,
            pattern: input.pattern,
            matchType: input.matchType,
            response: input.response,
            enabled: input.enabled ?? true,
          },
        })
      );
    },

    deleteRule$(guildId: string, pattern: string): Observable<void> {
      return from(
        prisma.keywordRule
          .delete({
            where: {
              guildId_pattern: {
                guildId,
                pattern,
              },
            },
          })
          .then(() => undefined)
      );
    },
  };
}
