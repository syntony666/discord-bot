import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { BotInteraction } from '@core/rx/bus';

// Import subcommand handlers
import { handleAddKeyword } from './subcommands/add';
import { handleListKeywords } from './subcommands/list';
import { handleEditKeyword } from './subcommands/edit';
import { handleDeleteKeyword } from './subcommands/delete';

/**
 * Setup keyword command handler.
 * Supports subcommands: add, list, edit, delete.
 */
export function setupKeywordCommand(module: KeywordModule) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;
    const guildId = interaction.guildId?.toString();

    if (!guildId) return;

    if (subName === 'add') {
      await handleAddKeyword(bot, interaction, module, guildId, sub);
    } else if (subName === 'list') {
      await handleListKeywords(bot, interaction, module, guildId);
    } else if (subName === 'edit') {
      await handleEditKeyword(bot, interaction, module, guildId, sub);
    } else if (subName === 'delete') {
      await handleDeleteKeyword(bot, interaction, module, guildId, sub);
    }
  };
}
