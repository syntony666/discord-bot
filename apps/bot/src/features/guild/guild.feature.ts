import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { Subscription, mergeMap, catchError, EMPTY, lastValueFrom } from 'rxjs';
import { createGuildModule, GuildModule } from './guild.module';
import { guildCreate$, guildDelete$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { Feature } from '@core/bootstrap/feature.interface';

const log = createLogger('GuildFeature');

export interface GuildFeature extends Feature {
  module: GuildModule;
}

export function setupGuildFeature(prisma: PrismaClient, bot: Bot): GuildFeature {
  const module = createGuildModule(prisma);
  const subscriptions: Subscription[] = [];

  // ========== Guild Create Event ==========
  // Ensure guild exists in database when bot joins
  const createSub = guildCreate$
    .pipe(
      mergeMap(async (guild) => {
        const guildId = guild.id.toString();
        try {
          await lastValueFrom(module.ensureGuild$(guildId, guild.name));
          log.info({ guildId, name: guild.name }, 'Guild record ensured');
        } catch (error) {
          log.error({ error, guildId }, 'Error ensuring guild record');
        }
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in guild create stream');
        return EMPTY;
      })
    )
    .subscribe();

  // ========== Guild Delete Event ==========
  // Clean up all guild data when bot leaves
  const deleteSub = guildDelete$
    .pipe(
      mergeMap(async (guildId) => {
        const guildIdStr = guildId.toString();
        try {
          await lastValueFrom(module.deleteGuild$(guildIdStr));
          log.info({ guildId: guildIdStr }, 'Guild deleted and cleaned up');
        } catch (error) {
          log.error({ error, guildId: guildIdStr }, 'Error cleaning up guild');
        }
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in guild delete stream');
        return EMPTY;
      })
    )
    .subscribe();

  subscriptions.push(createSub, deleteSub);

  log.info('Guild feature activated');

  return {
    name: 'Guild',
    module,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Guild feature cleaned up');
    },
  };
}
