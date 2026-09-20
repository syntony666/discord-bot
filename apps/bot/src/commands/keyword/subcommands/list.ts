import type { DiscordActions } from '@core/discord/discord-actions';
import { KeywordModule } from '@features/keyword/keyword.module';
import { lastValueFrom } from 'rxjs';
import { replyTextList } from 'shared/paginator/paginator.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { Formatters } from '@discord-bot/discord-client';

const log = createLogger('KeywordCommand');

export async function handleListKeywords(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string
) {
  try {
    const rules = await lastValueFrom(module.getRulesForList$(guildId));

    await replyTextList({
      actions,
      interaction,
      items: rules,
      title: () => `關鍵字規則列表`,
      mapItem: (r) =>
        `\`${r.matchType}\` ${Formatters.userMention(r.editorId)}\n**${r.pattern}** ⭢ ${r.response}\n`,
      emptyText: '目前沒有任何關鍵字規則。',
      pageSize: 10,
      userId: interaction.user?.id?.toString(),
    });
  } catch (error) {
    log.error({ error }, 'Failed to list keywords');
    await handleError(actions, interaction, error, 'keywordList');
  }
}
