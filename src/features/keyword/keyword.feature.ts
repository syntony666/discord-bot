import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { filter, mergeMap, lastValueFrom, catchError, EMPTY } from 'rxjs';
import { createKeywordModule, KeywordModule } from './keyword.module';
import { createKeywordService, KeywordService } from './keyword.service';
import { createKeywordCommandHandler } from '@adapters/discord/commands/keyword.command';
import { BotMessage, messageCreate$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';
import { Feature } from '@core/bootstrap/feature.interface';

const log = createLogger('KeywordFeature');

export interface KeywordFeature extends Feature {
  module: KeywordModule;
  service: KeywordService;
}

/**
 * Setup keyword feature.
 * Uses mergeMap for parallel processing since keyword responses are independent.
 */
export function setupKeywordFeature(prisma: PrismaClient, bot: Bot): KeywordFeature {
  const module = createKeywordModule(prisma);
  const service = createKeywordService(module);

  createKeywordCommandHandler(bot, module);

  const subscription = messageCreate$
    .pipe(
      filter((message: BotMessage) => {
        if (!message.guildId) return false;
        if (message.author?.id && message.author.id === bot.id) return false;
        const content = message.content ?? '';
        if (!content.trim()) return false;
        return true;
      }),
      mergeMap(async (message) => {
        const guildId = message.guildId!.toString();
        const channelId = message.channelId.toString();
        const content = message.content!;

        const match = await lastValueFrom(service.findMatch$(guildId, content));
        if (!match) return;

        await bot.helpers.sendMessage(message.channelId, {
          content: match.rule.response,
        });

        log.info(
          {
            guildId,
            channelId,
            pattern: match.rule.pattern,
          },
          'Sent keyword response'
        );
      }),
      handleDiscordError({
        operation: 'keywordTrigger',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in keyword feature stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  log.info('Keyword feature activated');

  return {
    name: 'Keyword',
    module,
    service,
    cleanup: () => {
      subscription.unsubscribe();
      log.info('Keyword feature cleaned up');
    },
  };
}
