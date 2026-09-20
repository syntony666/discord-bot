import type { CommandOption } from '@core/discord/discord.types';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { BotInteraction } from '@core/rx/bus';
import type { StatusCommandModules } from './status.command';

export interface CommandContext {
  actions: DiscordActions;
  interaction: BotInteraction;
  guildId: string;
  module: StatusCommandModules;
  subCommand: CommandOption;
}
