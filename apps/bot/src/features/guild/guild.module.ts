import { ApiRequest, GuildData, orNull } from '@discord-bot/shared';

const BASE = '/api/v1/guilds';

export function createGuildModule(request: ApiRequest) {
  return {
    ensureGuild(guildId: string, guildName?: string) {
      return request<GuildData>(`${BASE}/ensure`, {
        method: 'POST',
        body: JSON.stringify({ guildId, guildName }),
      });
    },
    getGuild(guildId: string) {
      return orNull(request<GuildData>(`${BASE}/${guildId}`));
    },
    deleteGuild(guildId: string) {
      return request<void>(`${BASE}/${guildId}`, { method: 'DELETE' });
    },
    listGuilds() {
      return request<GuildData[]>(BASE);
    },
  };
}

export type GuildModule = ReturnType<typeof createGuildModule>;
