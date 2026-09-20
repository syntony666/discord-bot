import type { DiscordActions } from '@core/discord/discord-actions';
import { interactionOptions, interactionCustomId, interactionComponents } from '@core/discord/interaction.helpers';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { BotInteraction } from '@core/rx/bus';
import type { CommandOption } from '@core/discord/discord.types';

import { handlePanelCreate } from './subcommands/panel-create';
import { handlePanelEdit } from './subcommands/panel-edit';
import { handlePanelDelete } from './subcommands/panel-delete';
import { handlePanelList } from './subcommands/panel-list';

import { handleAdd } from './subcommands/role-add';
import { handleRemove } from './subcommands/role-remove';
import { handleList } from './subcommands/role-list';

export function setupReactionRoleCommand(module: ReactionRoleModule, service: ReactionRoleService) {
  return async (interaction: BotInteraction, actions: DiscordActions) => {
    const guildId = interaction.guild_id?.toString();
    if (!guildId) return;

    const subGroup = interactionOptions(interaction)?.[0] as CommandOption;
    const subGroupName = subGroup?.name;

    if (subGroupName === 'panel') {
      const subCommand = subGroup.options?.[0] as CommandOption;
      const subCommandName = subCommand?.name;

      if (subCommandName === 'create') {
        await handlePanelCreate(actions, interaction, module, guildId, subCommand);
      } else if (subCommandName === 'list') {
        await handlePanelList(actions, interaction, module, guildId);
      } else if (subCommandName === 'delete') {
        await handlePanelDelete(actions, interaction, module, guildId, subCommand);
      } else if (subCommandName === 'edit') {
        await handlePanelEdit(actions, interaction, module, guildId, subCommand);
      }
    } else if (subGroupName === 'add') {
      await handleAdd(actions, interaction, module, service, guildId, subGroup);
    } else if (subGroupName === 'remove') {
      await handleRemove(actions, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'role-list') {
      await handleList(actions, interaction, module, guildId, subGroup);
    }
  };
}
