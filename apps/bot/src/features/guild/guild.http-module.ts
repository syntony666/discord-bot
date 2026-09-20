import { from } from 'rxjs';
import { ApiRequest, GuildData, orNull } from '@discord-bot/shared';
import { GuildModule } from './guild.module';

const BASE = '/api/v1/guilds';

export function createHttpGuildModule(request: ApiRequest): GuildModule {
  return {
    ensureGuild$(guildId, guildName) {
      return from(
        request<GuildData>(`${BASE}/ensure`, {
          method: 'POST',
          body: JSON.stringify({ guildId, guildName }),
        })
      );
    },
    getGuild$(guildId) {
      return from(orNull(request<GuildData>(`${BASE}/${guildId}`)));
    },
    deleteGuild$(guildId) {
      return from(request<void>(`${BASE}/${guildId}`, { method: 'DELETE' }));
    },
    listGuilds$() {
      return from(request<GuildData[]>(BASE));
    },
  };
}
