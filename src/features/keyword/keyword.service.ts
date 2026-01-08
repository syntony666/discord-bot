import type { KeywordRule, KeywordMatchType } from '@prisma-client/client';
import type { KeywordModule } from './keyword.module';
import { Observable, of, map, switchMap } from 'rxjs';
import { createSignal } from '@core/signals/signal';

export interface KeywordMatchResult {
  rule: KeywordRule;
}

export interface KeywordService {
  findMatch$(guildId: string, content: string): Observable<KeywordMatchResult | null>;
}

type GuildId = string;

// 簡單的 in-memory cache：guildId -> rules[]
const [getCache, setCache] = createSignal<Map<GuildId, KeywordRule[]>>(new Map());

function applyMatch(rule: KeywordRule, content: string): boolean {
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
  function loadRulesForGuild$(guildId: string): Observable<KeywordRule[]> {
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
