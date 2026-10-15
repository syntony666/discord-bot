import { useHandlers } from '@discord-bot/discord-client';
import { createLogger } from '@discord-bot/shared';
import type { GuildApi } from './guild.api';

const log = createLogger('Guild');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface GuildDeps {
  api: { guild: GuildApi };
}

export function useGuildHandlers(deps: GuildDeps) {
  const api = deps.api.guild;
  const h = useHandlers();

  h.event('guildCreate', async (guild) => {
    try {
      await api.ensureGuild(guild.id, guild.name);
      log.info({ guildId: guild.id, name: guild.name }, 'Guild record ensured');
    } catch (error) {
      log.error({ error, guildId: guild.id }, 'Error ensuring guild record');
    }
  });

  h.event('guildDelete', async (guild) => {
    // unavailable means a Discord outage, not the bot being removed.
    if (guild.unavailable) return;
    try {
      await api.deleteGuild(guild.id);
      log.info({ guildId: guild.id }, 'Guild deleted and cleaned up');
    } catch (error) {
      log.error({ error, guildId: guild.id }, 'Error cleaning up guild');
    }
  });

  return h.collect();
}
