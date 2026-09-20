import { Observable } from 'rxjs';
import {
  CreateKeywordRuleInput,
  KeywordRule,
  KeywordRuntime,
  UpdateKeywordRuleInput,
} from '@discord-bot/shared';

export type { CreateKeywordRuleInput, UpdateKeywordRuleInput };

export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRuntime[]>; // For service (high-frequency)
  getRulesForList$(guildId: string): Observable<KeywordRule[]>; // For list command (low-frequency)
  getRuleByPattern$(guildId: string, pattern: string): Observable<KeywordRule | null>;
  createRule$(input: CreateKeywordRuleInput): Observable<KeywordRule>;
  updateRule$(input: UpdateKeywordRuleInput): Observable<KeywordRule>;
  deleteRule$(guildId: string, pattern: string): Observable<void>;
}
