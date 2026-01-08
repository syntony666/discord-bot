import { interactionCreate$, type BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import type { Bot } from '@discordeno/bot';
import type { KeywordModule } from '@features/keyword/keyword.module';
import type { KeywordService } from '@features/keyword/keyword.service';
import { createKeywordCommandHandler } from './keyword.command';

const log = createLogger('InteractionHandler');

export function registerInteractionHandler(
  bot: Bot,
  deps: { keywordModule: KeywordModule; keywordService: KeywordService }
) {
  const handleKeyword = createKeywordCommandHandler(bot, deps.keywordModule);

  interactionCreate$.subscribe(async (interaction: BotInteraction) => {
    try {
      if (interaction.type !== 2) return;

      await handleKeyword(interaction);
    } catch (error) {
      log.error({ error }, 'Error handling interaction');
    }
  });
}
