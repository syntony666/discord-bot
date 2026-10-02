import { ApiRequest, BotStateEntry, TierLimitData, orNull } from '@discord-bot/shared';

const BASE = '/api/v1/bot-state';

export type TierLimitPatch = Partial<
  Pick<TierLimitData, 'streamWatchers' | 'keywordRules' | 'reactionRolePanels'>
>;

export function createBotApi(request: ApiRequest) {
  return {
    getState(key: string) {
      return orNull(request<BotStateEntry>(`${BASE}/${key}`));
    },
    setState(key: string, value: string) {
      return request<BotStateEntry>(`${BASE}/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
    },
    updateTierLimit(tier: string, patch: TierLimitPatch) {
      return request<TierLimitData>(`/api/v1/tier-limits/${tier}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
  };
}

export type BotApi = ReturnType<typeof createBotApi>;
