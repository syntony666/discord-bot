import { Bot } from '@discordeno/bot';
import { GuildModule, GuildData } from './guild.module';
import { Observable, from, lastValueFrom } from 'rxjs';
import { createLogger } from '@core/logger';
import { appConfig } from '@core/config';
import { BotGuild } from '@core/rx/bus';

const log = createLogger('GuildService');

export interface GuildServiceContext {
  bot: Bot;
  module: GuildModule;
}

export interface GuildService {
  /**
   * Sync a specific guild.
   * Fetches current data from Discord and updates database.
   */
  syncGuild$(guildId: string): Observable<GuildData>;

  /**
   * Sync all guilds from Discord API.
   * Called on bot ready event.
   */
  syncAllGuilds$(): Observable<GuildData[]>;
}

export function createGuildService(ctx: GuildServiceContext): GuildService {
  const { bot, module } = ctx;
  const bearerToken = appConfig.discord.token;

  return {
    /**
     * Sync specific guild from Discord.
     */
    syncGuild$(guildId: string): Observable<GuildData> {
      return from(
        (async () => {
          try {
            const guild = (await bot.helpers.getGuild(guildId)) as BotGuild;

            const memberCount = guild.approximateMemberCount ?? guild.memberCount ?? 0;

            return await lastValueFrom(module.updateGuildMemberCount$(guildId, memberCount));
          } catch (error) {
            log.warn({ error, guildId }, 'Failed to sync guild from Discord, using ensure');
            return await lastValueFrom(module.ensureGuild$(guildId));
          }
        })()
      );
    },

    /**
     * Sync all guilds from Discord API.
     */
    syncAllGuilds$(): Observable<GuildData[]> {
      return from(
        (async () => {
          try {
            const guilds = (await bot.helpers.getGuilds(bearerToken)) as BotGuild[];
            const syncResults: GuildData[] = [];

            for (const guild of guilds) {
              if (!guild.id) {
                log.warn({ guild }, 'Guild missing id, skipping');
                continue;
              }

              const guildId = guild.id.toString();
              const memberCount = guild.approximateMemberCount ?? guild.memberCount ?? 0;

              const result = await lastValueFrom(
                module.updateGuildMemberCount$(guildId, memberCount)
              );

              syncResults.push(result);
            }

            log.info({ count: syncResults.length }, 'Synced all guilds');
            return syncResults;
          } catch (error) {
            log.error({ error }, 'Error syncing all guilds');
            throw error;
          }
        })()
      );
    },
  };
}
