import { InteractionDataOption } from '@discordeno/bot';
import type { DiscordActions } from '@core/discord/discord-actions';
import { KeywordModule } from '@features/keyword/keyword.module';
import { BotInteraction } from '@core/rx/bus';

import { handleAddKeyword } from './subcommands/add';
import { handleListKeywords } from './subcommands/list';
import { handleEditKeyword } from './subcommands/edit';
import { handleDeleteKeyword } from './subcommands/delete';

export function setupKeywordCommand(module: KeywordModule) {
  return async (interaction: BotInteraction, actions: DiscordActions) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;
    const guildId = interaction.guildId?.toString();

    if (!guildId) return;

    if (subName === 'add') {
      await handleAddKeyword(actions, interaction, module, guildId, sub);
    } else if (subName === 'list') {
      await handleListKeywords(actions, interaction, module, guildId);
    } else if (subName === 'edit') {
      await handleEditKeyword(actions, interaction, module, guildId, sub);
    } else if (subName === 'delete') {
      await handleDeleteKeyword(actions, interaction, module, guildId, sub);
    }
  };
}
