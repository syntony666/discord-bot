import { KeywordMatchType } from './enums';

export interface KeywordRule {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType;
  response: string;
  enabled: boolean;
  editorId: string;
  createdAt: string;
  updatedAt: string;
}

export type KeywordRuntime = Pick<
  KeywordRule,
  'guildId' | 'pattern' | 'matchType' | 'response' | 'enabled'
>;

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
