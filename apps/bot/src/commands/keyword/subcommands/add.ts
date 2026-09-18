import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { userMention } from 'shared/utils/discord.utils';
import { createOverwriteConfirmation } from '../internal/confirmations';

const log = createLogger('KeywordCommand');

export async function handleAddKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const matchTypeStr = sub.options?.find((o: any) => o.name === 'match_type')?.value as string;
  const response = sub.options?.find((o: any) => o.name === 'response')?.value as string;

  const matchType =
    matchTypeStr === 'CONTAINS' ? KeywordMatchType.CONTAINS : KeywordMatchType.EXACT;

  const editorId = interaction.user?.id?.toString() || '';

  try {
    await lastValueFrom(
      module.createRule$({
        guildId,
        pattern,
        matchType,
        response,
        editorId,
      })
    );

    await replySuccess(bot, interaction, {
      title: '關鍵字已新增',
      description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
    });
  } catch (error: any) {
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      await handleDuplicateKeyword(bot, interaction, module, {
        guildId,
        pattern,
        matchType,
        response,
        editorId,
      });
    } else {
      log.error({ error, pattern }, 'Failed to add keyword');
      await handleError(bot, interaction, error, 'keywordAdd');
    }
  }
}

async function handleDuplicateKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  input: {
    guildId: string;
    pattern: string;
    matchType: KeywordMatchType;
    response: string;
    editorId: string;
  }
) {
  try {
    const existingRule = await lastValueFrom(
      module.getRuleByPattern$(input.guildId, input.pattern)
    );

    if (!existingRule) {
      await handleError(bot, interaction, { code: 'P2002' }, 'keywordAdd');
      return;
    }

    await createOverwriteConfirmation(
      bot,
      interaction,
      { ...input, existingRule },
      async (bot, interaction, data) => {
        try {
          await lastValueFrom(
            module.updateRule$({
              guildId: data.guildId,
              pattern: data.pattern,
              response: data.response,
              matchType: data.matchType,
              editorId: data.editorId,
            })
          );

          await replySuccess(bot, interaction, {
            title: '關鍵字已更新',
            description: `${userMention(data.editorId)} 已覆蓋更新關鍵字 \`${data.pattern}\``,
            fields: [
              {
                name: '新設定',
                value: `\`${data.matchType}\` **${data.pattern}** ⭢ ${data.response}`,
              },
            ],
            isEdit: true,
          });

          log.info({ pattern: data.pattern, guildId: data.guildId }, 'Keyword overwritten');
        } catch (error) {
          log.error({ error, pattern: data.pattern }, 'Failed to overwrite keyword');
          await handleError(bot, interaction, error, 'keywordEdit');
        }
      }
    );
  } catch (fetchError) {
    log.error({ error: fetchError, pattern: input.pattern }, 'Failed to fetch existing rule');
    await handleError(bot, interaction, fetchError, 'keywordAdd');
  }
}
