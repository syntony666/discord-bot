import { ApiRequest, BotStateEntry, orNull } from '@discord-bot/shared';

const BASE = '/api/v1/bot-state';

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
  };
}

export type BotApi = ReturnType<typeof createBotApi>;
