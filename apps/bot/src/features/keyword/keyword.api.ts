import {
  ApiRequest,
  CreateKeywordRuleInput,
  KeywordRule,
  KeywordRuntime,
  orNull,
  UpdateKeywordRuleInput,
} from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}/keyword-rules`;

export function createKeywordApi(request: ApiRequest) {
  return {
    // For service (high-frequency)
    getRulesByGuild(guildId: string) {
      return request<KeywordRuntime[]>(`${base(guildId)}?runtime`);
    },
    // For list command (low-frequency)
    getRulesForList(guildId: string) {
      return request<KeywordRule[]>(base(guildId));
    },
    searchRules(guildId: string, query: string) {
      return request<KeywordRule[]>(`${base(guildId)}?q=${encodeURIComponent(query)}`);
    },
    getRuleByPattern(guildId: string, pattern: string) {
      return orNull(
        request<KeywordRule>(`${base(guildId)}/${encodeURIComponent(pattern)}`)
      );
    },
    createRule(input: CreateKeywordRuleInput) {
      const { guildId, ...body } = input;
      return request<KeywordRule>(base(guildId), {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    updateRule(input: UpdateKeywordRuleInput) {
      const { guildId, pattern, ...body } = input;
      return request<KeywordRule>(
        `${base(guildId)}/${encodeURIComponent(pattern)}`,
        { method: 'PUT', body: JSON.stringify(body) }
      );
    },
    deleteRule(guildId: string, pattern: string) {
      return request<void>(`${base(guildId)}/${encodeURIComponent(pattern)}`, {
        method: 'DELETE',
      });
    },
  };
}

export type KeywordApi = ReturnType<typeof createKeywordApi>;
