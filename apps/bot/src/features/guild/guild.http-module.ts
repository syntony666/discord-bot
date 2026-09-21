import { ApiRequest, GuildData, orNull } from '@discord-bot/shared';
import { GuildModule } from './guild.module';

const BASE = '/api/v1/guilds';

export function createHttpGuildModule(request: ApiRequest): GuildModule {
  return {
    ensureGuild(guildId, guildName) {
      return request<GuildData>(`${BASE}/ensure`, {
        method: 'POST',
        body: JSON.stringify({ guildId, guildName }),
      });
    },
    getGuild(guildId) {
      return orNull(request<GuildData>(`${BASE}/${guildId}`));
    },
    deleteGuild(guildId) {
      return request<void>(`${BASE}/${guildId}`, { method: 'DELETE' });
    },
    listGuilds() {
      return request<GuildData[]>(BASE);
    },
  };
}
