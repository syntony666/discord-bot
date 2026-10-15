import type { KeywordRuntime } from '@discord-bot/shared';
import type { KeywordApi } from './keyword.api';

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  rules: KeywordRuntime[];
  expiresAt: number;
}

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
  const cache = new Map<string, CacheEntry>();

  return {
    async findMatch(guildId: string, content: string) {
      if (!guildId) return null;

      const now = Date.now();
      const cached = cache.get(guildId);
      const rules =
        cached && cached.expiresAt > now ? cached.rules : await api.getRulesByGuild(guildId);

      if (!cached || cached.expiresAt <= now) {
        cache.set(guildId, { rules, expiresAt: now + CACHE_TTL_MS });
      }

      return rules.find((rule) => applyMatch(rule, content)) ?? null;
    },
  };
}
