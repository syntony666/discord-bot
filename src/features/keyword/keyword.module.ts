import { PrismaClient, KeywordMatchType, type KeywordRule } from '@prisma-client/client';
import { Observable } from 'rxjs';

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
  deleteRule$(id: string): Observable<void>;
}

export function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    getRulesByGuild$(guildId: string): Observable<KeywordRule[]> {
      return new Observable<KeywordRule[]>((subscriber) => {
        prisma.keywordRule
          .findMany({
            where: { guildId, enabled: true },
          })
          .then((rules) => {
            subscriber.next(rules);
            subscriber.complete();
          })
          .catch((err) => subscriber.error(err));
      });
    },

    createRule$(input: CreateKeywordRuleInput): Observable<KeywordRule> {
      return new Observable<KeywordRule>((subscriber) => {
        prisma.keywordRule
          .create({
            data: {
              guildId: input.guildId,
              pattern: input.pattern,
              matchType: input.matchType,
              response: input.response,
              enabled: input.enabled ?? true,
            },
          })
          .then((rule) => {
            subscriber.next(rule);
            subscriber.complete();
          })
          .catch((err) => subscriber.error(err));
      });
    },

    deleteRule$(id: string): Observable<void> {
      return new Observable<void>((subscriber) => {
        prisma.keywordRule
          .delete({ where: { id } })
          .then(() => {
            subscriber.next();
            subscriber.complete();
          })
          .catch((err) => subscriber.error(err));
      });
    },
  };
}
