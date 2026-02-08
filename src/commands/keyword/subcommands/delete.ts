import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { lastValueFrom } from 'rxjs';
import { replyWarning } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { userMention } from 'shared/utils/discord.utils';
import { createDeleteConfirmation } from '../internal/confirmations';

const log = createLogger('KeywordCommand');

export async function handleDeleteKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const editorId = interaction.user?.id?.toString() || '';

  try {
    const ruleToDelete = await lastValueFrom(module.getRuleByPattern$(guildId, pattern));

    if (!ruleToDelete) {
      await handleError(bot, interaction, { code: 'P2025' }, 'keywordDelete');
      return;
    }

    await createDeleteConfirmation(
      bot,
      interaction,
      { guildId, pattern, editorId, ruleToDelete },
      async (bot, interaction, data) => {
        try {
          await lastValueFrom(module.deleteRule$(data.guildId, data.pattern));

          await replyWarning(bot, interaction, {
            title: '關鍵字已刪除',
            description: `${userMention(data.editorId)} 已刪除關鍵字 \`${data.pattern}\``,
            fields: [
              {
                name: '已刪除的設定',
                value: `\`${data.ruleToDelete.matchType}\` **${data.ruleToDelete.pattern}** ⭢ ${data.ruleToDelete.response}`,
              },
            ],
            isEdit: true,
          });

          log.info({ pattern: data.pattern, guildId: data.guildId }, 'Keyword deleted');
        } catch (error: any) {
          log.error({ error, pattern: data.pattern }, 'Failed to delete keyword');
          await handleError(bot, interaction, error, 'keywordDelete');
        }
      }
    );

    log.info({ pattern, guildId }, 'Delete confirmation requested');
  } catch (error) {
    log.error({ error, pattern }, 'Failed to prepare delete confirmation');
    await handleError(bot, interaction, error, 'keywordDelete');
  }
}
