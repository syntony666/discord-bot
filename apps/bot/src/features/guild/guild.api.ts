import { ApiRequest, GuildData, GuildDetail, orNull } from '@discord-bot/shared';

const BASE = '/api/v1/guilds';

export function createGuildApi(request: ApiRequest) {
  return {
    ensureGuild(guildId: string, guildName?: string) {
      return request<GuildData>(`${BASE}/ensure`, {
        method: 'POST',
        body: JSON.stringify({ guildId, guildName }),
      });
    },
    getGuild(guildId: string) {
      return orNull(request<GuildDetail>(`${BASE}/${guildId}`));
    },
    setTier(guildId: string, tier: string) {
      return request<GuildData>(`${BASE}/${guildId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tier }),
      });
    },
    deleteGuild(guildId: string) {
      return request<void>(`${BASE}/${guildId}`, { method: 'DELETE' });
    },
    listGuilds() {
      return request<GuildData[]>(BASE);
    },
  };
}

export type GuildApi = ReturnType<typeof createGuildApi>;
