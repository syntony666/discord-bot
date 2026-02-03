import { Bot } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { BotInteraction } from '@core/rx/bus';
import { commandRegistry } from '../command.registry';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { handlePanelCommands } from './panel/panel.handlers';
import { handleAdd, handleRemove, handleList } from './role/role.handlers';
import type { InteractionDataOption } from '@discordeno/bot';

const log = createLogger('ReactionRoleCommand');

/**
 * Setup reaction-role command handler.
 * Routes to panel or role handlers based on subcommand.
 */
export function setupReactionRoleCommand(
  module: ReactionRoleModule,
  service: ReactionRoleService
) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await handleError(bot, interaction, new Error('Guild ID missing'), 'reactionRolePanelCreate');
      return;
    }

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    try {
      if (subGroupName === 'panel') {
        await handlePanelCommands(bot, interaction, module, guildId, subGroup);
      } else if (subGroupName === 'add') {
        await handleAdd(bot, interaction, module, service, guildId, subGroup);
      } else if (subGroupName === 'remove') {
        await handleRemove(bot, interaction, module, guildId, subGroup);
      } else if (subGroupName === 'list') {
        await handleList(bot, interaction, module, guildId, subGroup);
      }
    } catch (error) {
      log.error({ error, guildId, subGroupName }, 'Unexpected error in reaction-role command');
      await handleError(bot, interaction, error, 'reactionRolePanelCreate');
    }
  };
}
