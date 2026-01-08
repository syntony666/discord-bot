import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { paginateTextList } from '@adapters/discord/shared/paginator/paginator.helper';
import { successReply, errorReply, autoErrorReply } from '@adapters/discord/shared/reply.helper';
import { BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';

const log = createLogger('KeywordCommand');

export function createKeywordCommandHandler(bot: Bot, module: KeywordModule) {
  const handler = async (interaction: BotInteraction) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;

    // Guard: 確保在伺服器內執行
    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await errorReply(bot, interaction, {
        description: 'This command can only be used in a server.',
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
  };;

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

    await successReply(bot, interaction, {
      title: 'Keyword Added',
      description: `Pattern \`${pattern}\` has been added successfully.`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to add keyword');

    await autoErrorReply(bot, interaction, error, {
      duplicate: `Pattern \`${pattern}\` already exists. Please use a different pattern or delete the existing one first.`,
      generic: 'Failed to add keyword rule. Please try again later.',
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

    await paginateTextList({
      bot,
      interaction,
      items: rules,
      title: () => `Keyword Rules`,
      mapItem: (r) => `\`${r.matchType}\` **${r.pattern}** ⭢ ${r.response}`,
      emptyText: 'No keyword rules found.',
      pageSize: 10,
      userId: interaction.user?.id?.toString(),
    });
  } catch (error) {
    log.error({ error }, 'Failed to list keywords');

    await errorReply(bot, interaction, {
      description: 'Failed to retrieve keyword rules. Please try again later.',
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

    await successReply(bot, interaction, {
      title: 'Keyword Deleted',
      description: `Pattern \`${pattern}\` has been deleted successfully.`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to delete keyword');

    await autoErrorReply(bot, interaction, error, {
      notFound: `Pattern \`${pattern}\` does not exist.`,
      generic: 'Failed to delete keyword rule. Please try again later.',
    });
  }
}
