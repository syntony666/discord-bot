import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { Subscription, lastValueFrom, mergeMap, catchError, EMPTY, from } from 'rxjs';
import { createGuildModule, GuildModule } from './guild.module';
import { createGuildService, GuildService } from './guild.service';
import { guildCreate$, guildDelete$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { Feature } from '@core/bootstrap/feature.interface';

const log = createLogger('GuildFeature');

export interface GuildFeature extends Feature {
  module: GuildModule;
  service: GuildService;
}

/**
 * Setup guild lifecycle management feature.
 * Handles guild creation, deletion, and member synchronization.
 */
export function setupGuildFeature(prisma: PrismaClient, bot: Bot): GuildFeature {
  const module = createGuildModule(prisma);
  const service = createGuildService({ bot, module });

  const subscriptions: Subscription[] = [];

  // ========== Guild Ready Event ==========
  // Sync all guilds when bot connects
  const readySub = from(
    (async () => {
      try {
        log.info('Syncing all guilds on ready');
        await lastValueFrom(service.syncAllGuilds$());
        log.info('Guild sync completed');
      } catch (error) {
        log.error({ error }, 'Error syncing guilds on ready');
      }
    })()
  ).subscribe();

  // ========== Guild Create Event ==========
  const createSub = guildCreate$
    .pipe(
      mergeMap(async (guild) => {
        const guildId = guild.id.toString();
        try {
          await lastValueFrom(module.ensureGuild$(guildId, guild.name));
          log.info({ guildId, name: guild.name }, 'Guild created and synced');
        } catch (error) {
          log.error({ error, guildId }, 'Error syncing guild on create');
        }
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in guild create stream');
        return EMPTY;
      })
    )
    .subscribe();

  // ========== Guild Delete Event ==========
  const deleteSub = guildDelete$
    .pipe(
      mergeMap(async (guildId) => {
        const guildIdStr = guildId.toString();
        try {
          await lastValueFrom(module.deleteGuild$(guildIdStr));
          log.info({ guildId: guildIdStr }, 'Guild deleted and cleaned up');
        } catch (error) {
          log.error({ error, guildId: guildIdStr }, 'Error cleaning up guild on delete');
        }
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in guild delete stream');
        return EMPTY;
      })
    )
    .subscribe();

  subscriptions.push(readySub, createSub, deleteSub);

  log.info('Guild feature activated');

  return {
    name: 'Guild',
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Guild feature cleaned up');
    },
  };
}
