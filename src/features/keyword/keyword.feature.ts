// src/features/keyword/keyword.feature.ts

import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { lastValueFrom, Subscription, filter, mergeMap, catchError, EMPTY } from 'rxjs';
import { createKeywordModule, KeywordModule } from './keyword.module';
import { createKeywordService, KeywordService } from './keyword.service';
import { messageCreate$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { createKeywordCommandHandler } from '@adapters/discord/commands/keyword.command';
import { notify } from '@adapters/discord/shared/message/message.helper';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';
import { Feature } from '@core/bootstrap/feature.interface';
import { GuildModule } from '@features/guild/guild.module';

const log = createLogger('KeywordFeature');

export interface KeywordFeature extends Feature {
  module: KeywordModule;
  service: KeywordService;
}

/**
 * Setup keyword auto-reply feature.
 * Uses filter to ignore bot messages, then mergeMap for parallel processing.
 */
export function setupKeywordFeature(
  prisma: PrismaClient,
  bot: Bot,
  guildModule: GuildModule // ← 加入參數
): KeywordFeature {
  const module = createKeywordModule(prisma);
  const service = createKeywordService(module);

  createKeywordCommandHandler(bot, module); // ← 目前不需要傳 guildModule（command 內沒用到 ensureGuild）

  const subscriptions: Subscription[] = [];

  const messageCreateSub = messageCreate$
    .pipe(
      filter((msg) => msg.guildId !== null && !msg.author.bot), // Ignore DMs and bot messages
      mergeMap(async (msg) => {
        const guildId = msg.guildId!.toString();
        const match = await lastValueFrom(service.findMatch$(guildId, msg.content));

        if (match) {
          try {
            await bot.helpers.sendMessage(msg.channelId, {
              content: match.rule.response,
            });
            log.info({ guildId, pattern: match.rule.pattern }, 'Keyword matched and replied');
          } catch (error: any) {
            if (error?.code === 50013) {
              log.warn({ guildId, error: error.message }, 'Missing permissions to send message');
            } else {
              log.error({ error, guildId }, 'Failed to send keyword response');
            }
          }
        }
      }),
      handleDiscordError({
        operation: 'keywordMatch',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in keyword stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  subscriptions.push(messageCreateSub);

  log.info('Keyword feature activated');

  return {
    name: 'Keyword',
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Keyword feature cleaned up');
    },
  };
}
