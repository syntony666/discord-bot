import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { paginateTextList } from '@adapters/discord/shared/paginator/paginator.helper';
import { embedReplyHelper } from '@adapters/discord/shared/embed-reply.helper';
import { BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';

export function createKeywordCommandHandler(bot: Bot, module: KeywordModule) {
  const handler = async (interaction: BotInteraction) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;

    if (subName === 'add') {
      const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
      const matchTypeStr = sub.options?.find((o: any) => o.name === 'match_type')?.value as string;
      const response = sub.options?.find((o: any) => o.name === 'response')?.value as string;

      const guildId = interaction.guildId?.toString();
      if (!guildId) return;

      const matchType =
        matchTypeStr === 'CONTAINS' ? KeywordMatchType.CONTAINS : KeywordMatchType.EXACT;

      await lastValueFrom(module.createRule$({ guildId, pattern, matchType, response }));

      await embedReplyHelper({
        bot,
        interaction,
        title: 'Keyword',
        description: 'Keyword rule added.',
        color: 0x57f287,
        timestamp: true,
      });
    }

    if (subName === 'list') {
      const guildId = interaction.guildId?.toString();
      if (!guildId) return;

      const rules = await lastValueFrom(module.getRulesByGuild$(guildId));

      await paginateTextList({
        bot,
        interaction,
        items: rules,
        title: () => `Keyword rules`,
        mapItem: (r) => `\`${r.matchType}\` **${r.pattern}** ⭢ ${r.response}\n`,
        emptyText: 'No keyword rules.',
        pageSize: 10,
        userId: interaction.user?.id?.toString(),
      });
    }

    if (subName === 'delete') {
      const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
      const guildId = interaction.guildId?.toString();
      if (!guildId) return;

      await lastValueFrom(module.deleteRule$(guildId, pattern));

      await embedReplyHelper({
        bot,
        interaction,
        title: 'Keyword',
        description: `Keyword rule for pattern \`${pattern}\` deleted.`,
        color: 0x57f287,
        timestamp: true,
      });
    }
  };

  commandRegistry.registerCommand('keyword', handler);
  return handler;
}
