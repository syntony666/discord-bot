import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { filter, mergeMap, lastValueFrom } from 'rxjs';
import { createKeywordModule, KeywordModule } from './keyword.module';
import { createKeywordService, KeywordService } from './keyword.service';
import { createKeywordCommandHandler } from '@adapters/discord/commands/keyword.command';
import { BotMessage, messageCreate$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';

const log = createLogger('KeywordFeature');

export interface KeywordFeature {
  module: KeywordModule;
  service: KeywordService;
  cleanup: () => void;
}

export function setupKeywordFeature(prisma: PrismaClient, bot: Bot): KeywordFeature {
  const module = createKeywordModule(prisma);
  const service = createKeywordService(module);

  createKeywordCommandHandler(bot, module);

  const subscription = messageCreate$
    .pipe(
      (filter((message: BotMessage) => {
        if (!message.guildId) return false;
        if (message.author?.id && message.author.id === bot.id) return false;
        const content = message.content ?? '';
        if (!content.trim()) return false;
        return true;
      }),
      mergeMap(async (message) => {
        try {
          const guildId = message.guildId!.toString();
          const content = message.content!;

          const match = await lastValueFrom(service.findMatch$(guildId, content));
          if (!match) return;

          await bot.helpers.sendMessage(message.channelId, {
            content: match.rule.response,
          });

          log.info(
            {
              guildId,
              channelId: message.channelId.toString(),
              pattern: match.rule.pattern,
            },
            'Sent keyword response'
          );
        } catch (error: any) {
          if (error.code === 50013) {
            log.warn(
              { channelId: message.channelId.toString(), error: error.message },
              'Missing permission to send keyword response'
            );
          } else if (error.code === 50001) {
            log.warn(
              { channelId: message.channelId.toString(), error: error.message },
              'Missing access to channel'
            );
          } else {
            log.error(
              { error, messageId: message.id.toString(), guildId: message.guildId?.toString() },
              'Error handling keyword message'
            );
          }
        }
      }))
    )
    .subscribe();

  log.info('Keyword feature activated');

  return {
    module,
    service,
    cleanup: () => {
      subscription.unsubscribe();
      log.info('Keyword feature cleaned up');
    },
  };
}
