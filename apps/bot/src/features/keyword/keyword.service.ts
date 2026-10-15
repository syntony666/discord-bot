import type { KeywordRuntime } from '@discord-bot/shared';
import type { KeywordApi } from './keyword.api';

export interface KeywordService {
  findMatch(guildId: string, content: string): Promise<KeywordRuntime | null>;
}

function applyMatch(rule: KeywordRuntime, content: string): boolean {
  const text = content.trim();
  const pattern = rule.pattern.trim();

  if (rule.matchType === 'EXACT') {
    return text === pattern;
  }

  if (rule.matchType === 'CONTAINS') {
    return text.includes(pattern);
  }

  return false;
}

export function createKeywordService(api: KeywordApi): KeywordService {
  return {
    async findMatch(guildId: string, content: string) {
      if (!guildId) return null;
      const rules = await api.getRulesByGuild(guildId);
      return rules.find((rule) => applyMatch(rule, content)) ?? null;
    },
  };
}
