import { from } from 'rxjs';
import {
  ApiRequest,
  KeywordRule,
  KeywordRuntime,
  orNull,
} from '@discord-bot/shared';
import { CreateKeywordRuleInput, KeywordModule, UpdateKeywordRuleInput } from './keyword.module';

const base = (guildId: string) => `/api/v1/guilds/${guildId}/keyword-rules`;

export function createHttpKeywordModule(request: ApiRequest): KeywordModule {
  return {
    getRulesByGuild$(guildId) {
      return from(request<KeywordRuntime[]>(`${base(guildId)}?runtime`));
    },
    getRulesForList$(guildId) {
      return from(request<KeywordRule[]>(base(guildId)));
    },
    getRuleByPattern$(guildId, pattern) {
      return from(orNull(request<KeywordRule>(`${base(guildId)}/${encodeURIComponent(pattern)}`)));
    },
    createRule$(input: CreateKeywordRuleInput) {
      const { guildId, ...body } = input;
      return from(
        request<KeywordRule>(base(guildId), { method: 'POST', body: JSON.stringify(body) })
      );
    },
    updateRule$(input: UpdateKeywordRuleInput) {
      const { guildId, pattern, ...body } = input;
      return from(
        request<KeywordRule>(`${base(guildId)}/${encodeURIComponent(pattern)}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    },
    deleteRule$(guildId, pattern) {
      return from(
        request<void>(`${base(guildId)}/${encodeURIComponent(pattern)}`, { method: 'DELETE' })
      );
    },
  };
}
