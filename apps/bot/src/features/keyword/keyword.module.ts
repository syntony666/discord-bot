import {
  CreateKeywordRuleInput,
  KeywordRule,
  KeywordRuntime,
  UpdateKeywordRuleInput,
} from '@discord-bot/shared';

export type { CreateKeywordRuleInput, UpdateKeywordRuleInput };

export interface KeywordModule {
  getRulesByGuild(guildId: string): Promise<KeywordRuntime[]>; // For service (high-frequency)
  getRulesForList(guildId: string): Promise<KeywordRule[]>; // For list command (low-frequency)
  getRuleByPattern(guildId: string, pattern: string): Promise<KeywordRule | null>;
  createRule(input: CreateKeywordRuleInput): Promise<KeywordRule>;
  updateRule(input: UpdateKeywordRuleInput): Promise<KeywordRule>;
  deleteRule(guildId: string, pattern: string): Promise<void>;
}
