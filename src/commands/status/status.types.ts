import type { InteractionDataOption } from '@discordeno/bot';

/**
 * Command execution context
 */
export interface CommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  subCommand: InteractionDataOption;
}
