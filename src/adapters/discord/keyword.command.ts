import type { KeywordModule } from '@features/keyword/keyword.module';
import type { Bot } from '@discordeno/bot';
import { KeywordMatchType } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';

export function createKeywordCommandHandler(bot: Bot, module: KeywordModule) {
  return async (interaction: any) => {
    if (interaction.data?.name !== 'keyword') return;

    const sub = interaction.data.options?.[0];
    const subName = sub?.name;

    if (subName === 'add') {
      const pattern = sub.options.find((o: any) => o.name === 'pattern')?.value as string;
      const matchTypeStr = sub.options.find((o: any) => o.name === 'match_type')?.value as string;
      const response = sub.options.find((o: any) => o.name === 'response')?.value as string;

      const guildId = interaction.guildId?.toString();
      if (!guildId) {
        return;
      }

      const matchType =
        matchTypeStr === 'CONTAINS' ? KeywordMatchType.CONTAINS : KeywordMatchType.EXACT;

      await lastValueFrom(
        module.createRule$({
          guildId,
          pattern,
          matchType,
          response,
        })
      );

      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: 'Keyword rule added.',
        },
      });
    }

    if (subName === 'list') {
      const guildId = interaction.guildId?.toString();
      if (!guildId) return;

      const rules = await lastValueFrom(module.getRulesByGuild$(guildId));
      const lines = rules.map((r) => `\`[${r.matchType}]\` ${r.pattern} -> ${r.response}`);
      const content = lines.length ? lines.join('\n') : 'No keyword rules.';

      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 4,
        data: { content },
      });
    }

    if (subName === 'delete') {
      const pattern = sub.options.find((o: any) => o.name === 'pattern')?.value as string;
      const guildId = interaction.guildId?.toString();
      if (!guildId) return;

      await lastValueFrom(module.deleteRule$(guildId, pattern));

      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `Keyword rule for pattern \`${pattern}\` deleted.`,
        },
      });
    }
  };
}
