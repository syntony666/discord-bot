import { ApiRequest, AutoFeature, AutoFeatureType, orNull } from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}/auto-features`;

export function createAutoApi(request: ApiRequest) {
  return {
    getFeature(guildId: string, feature: AutoFeatureType) {
      return orNull(request<AutoFeature>(`${base(guildId)}/${feature}`));
    },
    setFeature(guildId: string, feature: AutoFeatureType, enabled: boolean) {
      return request<AutoFeature>(`${base(guildId)}/${feature}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
    },
  };
}

export type AutoApi = ReturnType<typeof createAutoApi>;
