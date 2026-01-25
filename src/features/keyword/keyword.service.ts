// src/features/keyword/keyword.service.ts

import type { KeywordRuntime } from './keyword.select'; // ← 改用 KeywordRuntime
import type { KeywordModule } from './keyword.module';
import { Observable, of, map } from 'rxjs';
import { createSignal } from '@core/signals/signal';

export interface KeywordMatchResult {
  rule: KeywordRuntime; // ← 改用 KeywordRuntime
}

export interface KeywordService {
  findMatch$(guildId: string, content: string): Observable<KeywordMatchResult | null>;
}

type GuildId = string;

// In-memory cache: guildId -> rules[]
const [getCache, setCache] = createSignal<Map<GuildId, KeywordRuntime[]>>(new Map()); // ← 改用 KeywordRuntime[]

function applyMatch(rule: KeywordRuntime, content: string): boolean {
  // ← 改用 KeywordRuntime
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
  function loadRulesForGuild$(guildId: string): Observable<KeywordRuntime[]> {
    // ← 改用 KeywordRuntime[]
    const cache = getCache();
    const cached = cache.get(guildId);
    if (cached) {
      return of(cached);
    }

    return module.getRulesByGuild$(guildId).pipe(
      map((rules) => {
        const mapCopy = new Map(cache);
        mapCopy.set(guildId, rules);
        setCache(mapCopy);
        return rules;
      })
    );
  }

  return {
    findMatch$(guildId: string, content: string): Observable<KeywordMatchResult | null> {
      if (!guildId) {
        return of(null);
      }

      return loadRulesForGuild$(guildId).pipe(
        map((rules) => {
          const matched = rules.find((rule) => applyMatch(rule, content));
          if (!matched) return null;
          return { rule: matched };
        })
      );
    },
  };
}
