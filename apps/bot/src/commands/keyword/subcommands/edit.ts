import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';

const log = createLogger('KeywordCommand');

export async function handleEditKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const response = sub.options?.find((o: any) => o.name === 'response')?.value as string;
  const matchType =
    sub.options?.find((o: any) => o.name === 'match_type')?.value === 'CONTAINS'
      ? KeywordMatchType.CONTAINS
      : KeywordMatchType.EXACT;

  const editorId = interaction.user?.id?.toString() || '';

  try {
    await lastValueFrom(
      module.updateRule$({
        guildId,
        pattern,
        response,
        matchType,
        editorId,
      })
    );

    await replySuccess(bot, interaction, {
      title: '關鍵字已更新',
      description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to edit keyword');
    await handleError(bot, interaction, error, 'keywordEdit');
  }
}
