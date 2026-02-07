import type { KeywordRuntime } from './keyword.select'; // ← 改用 KeywordRuntime
import type { KeywordModule } from './keyword.module';
import { Observable, of, map } from 'rxjs';

export interface KeywordMatchResult {
  rule: KeywordRuntime; // ← 改用 KeywordRuntime
}

export interface KeywordService {
  findMatch$(guildId: string, content: string): Observable<KeywordMatchResult | null>;
}

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
  return {
    findMatch$(guildId: string, content: string): Observable<KeywordMatchResult | null> {
      if (!guildId) {
        return of(null);
      }

      return module.getRulesByGuild$(guildId).pipe(
        map((rules) => {
          const matched = rules.find((rule) => applyMatch(rule, content));
          if (!matched) return null;
          return { rule: matched };
        })
      );
    },
  };
}
