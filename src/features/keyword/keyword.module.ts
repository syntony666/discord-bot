// src/features/keyword/keyword.module.ts

import { PrismaClient, KeywordMatchType, type KeywordRule } from '@prisma-client/client';
import { Observable, from } from 'rxjs';
import { keywordRuntimeSelect, KeywordRuntime } from './keyword.select';

export interface CreateKeywordRuleInput {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType;
  response: string;
  editorId: string;
  enabled?: boolean;
}

export interface UpdateKeywordRuleInput {
  guildId: string;
  pattern: string;
  response: string;
  matchType?: KeywordMatchType;
  editorId: string;
}

export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRuntime[]>; // For service (high-frequency)
  getRulesForList$(guildId: string): Observable<KeywordRule[]>; // For list command (low-frequency)
  getRuleByPattern$(guildId: string, pattern: string): Observable<KeywordRule | null>;
  createRule$(input: CreateKeywordRuleInput): Observable<KeywordRule>;
  updateRule$(input: UpdateKeywordRuleInput): Observable<KeywordRule>;
  deleteRule$(guildId: string, pattern: string): Observable<void>;
}

export function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    /**
     * Get active rules for runtime matching (optimized, no timestamps/editorId).
     * Used by: keyword.service (messageCreate event handler)
     */
    getRulesByGuild$(guildId: string): Observable<KeywordRuntime[]> {
      return from(
        prisma.keywordRule.findMany({
          where: { guildId, enabled: true },
          orderBy: { createdAt: 'desc' },
          select: keywordRuntimeSelect,
        })
      );
    },

    /**
     * Get rules for list display (full model with editorId).
     * Used by: /keyword list command
     */
    getRulesForList$(guildId: string): Observable<KeywordRule[]> {
      return from(
        prisma.keywordRule.findMany({
          where: { guildId, enabled: true },
          orderBy: { createdAt: 'desc' },
        })
      );
    },

    getRuleByPattern$(guildId: string, pattern: string): Observable<KeywordRule | null> {
      return from(
        prisma.keywordRule.findUnique({
          where: {
            guildId_pattern: { guildId, pattern },
          },
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
            editorId: input.editorId,
            enabled: input.enabled ?? true,
          },
        })
      );
    },

    updateRule$(input: UpdateKeywordRuleInput): Observable<KeywordRule> {
      const updateData: any = {
        response: input.response,
        editorId: input.editorId,
        updatedAt: new Date(),
      };

      if (input.matchType !== undefined) {
        updateData.matchType = input.matchType;
      }

      return from(
        prisma.keywordRule.update({
          where: {
            guildId_pattern: {
              guildId: input.guildId,
              pattern: input.pattern,
            },
          },
          data: updateData,
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
