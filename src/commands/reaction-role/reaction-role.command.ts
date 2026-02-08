import { Bot } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { BotInteraction } from '@core/rx/bus';
import type { InteractionDataOption } from '@discordeno/bot';

import { handlePanelCreate } from './subcommands/panel-create';
import { handlePanelEdit } from './subcommands/panel-edit';
import { handlePanelDelete } from './subcommands/panel-delete';
import { handlePanelList } from './subcommands/panel-list';

import { handleAdd } from './subcommands/role-add';
import { handleRemove } from './subcommands/role-remove';
import { handleList } from './subcommands/role-list';

export function setupReactionRoleCommand(module: ReactionRoleModule, service: ReactionRoleService) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) return;

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    if (subGroupName === 'panel') {
      const subCommand = subGroup.options?.[0] as InteractionDataOption;
      const subCommandName = subCommand?.name;

      if (subCommandName === 'create') {
        await handlePanelCreate(bot, interaction, module, guildId, subCommand);
      } else if (subCommandName === 'list') {
        await handlePanelList(bot, interaction, module, guildId);
      } else if (subCommandName === 'delete') {
        await handlePanelDelete(bot, interaction, module, guildId, subCommand);
      } else if (subCommandName === 'edit') {
        await handlePanelEdit(bot, interaction, module, guildId, subCommand);
      }
    } else if (subGroupName === 'add') {
      await handleAdd(bot, interaction, module, service, guildId, subGroup);
    } else if (subGroupName === 'remove') {
      await handleRemove(bot, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'role-list') {
      await handleList(bot, interaction, module, guildId, subGroup);
    }
  };
}
