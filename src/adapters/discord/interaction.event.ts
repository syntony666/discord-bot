import { interactionCreate$, type BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import type { Bot } from '@discordeno/bot';
import type { KeywordModule } from '@features/keyword/keyword.module';
import type { KeywordService } from '@features/keyword/keyword.service';
import { createKeywordCommandHandler } from './keyword.command';
import { PaginatorSessionRepository } from './paginator/paginator.repository';
import { PaginatorService } from './paginator/paginator.service';

const log = createLogger('InteractionHandler');

export function registerInteractionHandler(
  bot: Bot,
  deps: { keywordModule: KeywordModule; keywordService: KeywordService }
) {
  const handleKeyword = createKeywordCommandHandler(bot, deps.keywordModule);

  const paginatorRepo = new PaginatorSessionRepository();
  const paginatorService = new PaginatorService(paginatorRepo);

  interactionCreate$.subscribe(async (interaction: BotInteraction) => {
    try {
      if (interaction.data?.customId?.startsWith?.('pg:')) {
        await paginatorService.handleButton(bot as any, interaction);
        return;
      }
      if (interaction.type === 2 && interaction.data?.name === 'keyword') {
        await handleKeyword(interaction);
      }
    } catch (error) {
      console.log(error);
      log.error({ error }, 'Error handling interaction');
    }
  });
}
