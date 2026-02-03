import { Bot, InteractionDataOption } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';

// Import subcommand handlers
import { handleBotStatus } from './subcommands/bot';
import { handleGuildStatus } from './subcommands/guild';

/**
 * Setup status command handler.
 * Supports subcommands: bot, guild.
 */
export function setupStatusCommand() {
  return async (interaction: BotInteraction, bot: Bot) => {
    const subcommand = interaction.data?.options?.[0] as InteractionDataOption;
    if (!subcommand) return;

    if (subcommand.name === 'bot') {
      await handleBotStatus(interaction, bot);
    } else if (subcommand.name === 'guild') {
      await handleGuildStatus(interaction, bot);
    }
  };
}
