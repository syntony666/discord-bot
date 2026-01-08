// src/adapters/discord/message.event.ts
import type { BotMessage } from '@core/rx/bus';
import { messageCreate$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import type { KeywordService } from '@features/keyword/keyword.service';
import { lastValueFrom } from 'rxjs';

const log = createLogger('MessageHandler');

export function registerMessageHandler(
  bot: { id: bigint; helpers: { sendMessage: Function } },
  keywordService: KeywordService
) {
  messageCreate$.subscribe(async (message: BotMessage) => {
    try {
      if (!message.guildId) return;

      if (message.author.id && message.author.id === bot.id) return;

      const content = message.content ?? '';
      if (!content.trim()) return;

      const guildId = message.guildId.toString();
      const match = await lastValueFrom(keywordService.findMatch$(guildId, content));
      if (!match) return;

      await bot.helpers.sendMessage(message.channelId, {
        content: match.rule.response,
      });
    } catch (error) {
      log.error({ error }, 'Error handling message');
    }
  });
}
