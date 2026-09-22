import type { KeywordRuntime } from '@discord-bot/shared';
import type { KeywordModule } from './keyword.module';

export interface KeywordMatchResult {
  rule: KeywordRuntime;
}

export interface KeywordService {
  findMatch(guildId: string, content: string): Promise<KeywordMatchResult | null>;
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

export function createKeywordService(module: KeywordModule): KeywordService {
  return {
    async findMatch(guildId: string, content: string) {
      if (!guildId) return null;
      const rules = await module.getRulesByGuild(guildId);
      const matched = rules.find((rule) => applyMatch(rule, content));
      return matched ? { rule: matched } : null;
    },
  };
}
