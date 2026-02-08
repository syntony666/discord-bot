import type { InteractionDataOption } from '@discordeno/bot';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';
import type { StatusCommandModules } from './status.command';

export interface CommandContext {
  bot: Bot;
  interaction: BotInteraction;
  guildId: string;
  module: StatusCommandModules;
  subCommand: InteractionDataOption;
}
