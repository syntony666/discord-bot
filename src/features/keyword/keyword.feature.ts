import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { filter } from 'rxjs/operators';
import { createKeywordModule, KeywordModule } from './keyword.module';
import { createKeywordService, KeywordService } from './keyword.service';
import { createKeywordCommandHandler } from '@adapters/discord/commands/keyword.command';
import { messageCreate$ } from '@core/rx/bus';
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
      filter((message) => {
        if (!message.guildId) return false;
        if (message.author?.id && message.author.id === bot.id) return false;
        const content = message.content ?? '';
        if (!content.trim()) return false;
        return true;
      })
    )
    .subscribe(async (message) => {
      try {
        const guildId = message.guildId!.toString();
        const content = message.content!;

        const match = await service.findMatch$(guildId, content).toPromise();
        if (!match) return;

        await bot.helpers.sendMessage(message.channelId, {
          content: match.rule.response,
        });
      } catch (error: any) {
        // 處理發送訊息權限錯誤
        if (error.code === 50013 || error.code === 50001) {
          log.warn(
            { channelId: message.channelId, error: error.message },
            'Missing permission to send keyword response'
          );
        } else {
          log.error({ error, messageId: message.id }, 'Error handling keyword message');
        }
      }
    });

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
