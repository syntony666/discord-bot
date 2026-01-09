import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { replyTextList } from '@adapters/discord/shared/paginator/paginator.helper';
import {
  replySuccess,
  replyError,
  replyAutoError,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';

const log = createLogger('KeywordCommand');
/**
 * Slash command handler for /keyword.
 * Supports subcommands: add, list, delete.
 */
export function createKeywordCommandHandler(bot: Bot, module: KeywordModule) {
  const handler = async (interaction: BotInteraction) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;

    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await replyError(bot, interaction, {
        description: '此指令只能在伺服器中使用。',
      });
      return;
    }

    if (subName === 'add') {
      await handleAddKeyword(bot, interaction, module, guildId, sub);
    } else if (subName === 'list') {
      await handleListKeywords(bot, interaction, module, guildId);
    } else if (subName === 'delete') {
      await handleDeleteKeyword(bot, interaction, module, guildId, sub);
    }
  };

  commandRegistry.registerCommand('keyword', handler);
  return handler;
}

async function handleAddKeyword(
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

  try {
    await lastValueFrom(module.createRule$({ guildId, pattern, matchType, response }));

    await replySuccess(bot, interaction, {
      title: '關鍵字已新增',
      description: `關鍵字 \`${pattern}\` 已成功新增。`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to add keyword');

    await replyAutoError(bot, interaction, error, {
      duplicate: `關鍵字 \`${pattern}\` 已經存在，請使用其他關鍵字或先刪除原有規則。`,
      generic: '新增關鍵字規則時發生錯誤，請稍後再試。',
    });
  }
}

async function handleListKeywords(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string
) {
  try {
    const rules = await lastValueFrom(module.getRulesByGuild$(guildId));

    await replyTextList({
      bot,
      interaction,
      items: rules,
      title: () => `關鍵字規則列表`,
      mapItem: (r) => `\`${r.matchType}\` **${r.pattern}** ⭢ ${r.response}\n`,
      emptyText: '目前沒有任何關鍵字規則。',
      pageSize: 10,
      userId: interaction.user?.id?.toString(),
    });
  } catch (error) {
    log.error({ error }, 'Failed to list keywords');

    await replyError(bot, interaction, {
      description: '取得關鍵字規則時發生錯誤，請稍後再試。',
    });
  }
}

async function handleDeleteKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;

  try {
    await lastValueFrom(module.deleteRule$(guildId, pattern));

    await replySuccess(bot, interaction, {
      title: '關鍵字已刪除',
      description: `關鍵字 \`${pattern}\` 已成功刪除。`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to delete keyword');

    await replyAutoError(bot, interaction, error, {
      notFound: `關鍵字 \`${pattern}\` 不存在。`,
      generic: '刪除關鍵字規則時發生錯誤，請稍後再試。',
    });
  }
}
