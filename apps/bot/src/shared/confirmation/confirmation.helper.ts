import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ConfirmationConfig, ConfirmationHandler } from './confirmation.types';

let confirmationStrategy: any = null;

export function _setConfirmationStrategy(strategy: any): void {
  confirmationStrategy = strategy;
}

export async function createConfirmation<TData = any>(
  bot: Bot,
  interaction: BotInteraction,
  config: ConfirmationConfig<TData>,
  handler: ConfirmationHandler<TData>
): Promise<string> {
  if (!confirmationStrategy) {
    throw new Error('ConfirmationStrategy not initialized. This should not happen.');
  }
  return confirmationStrategy.createConfirmation(bot, interaction, config, handler);
}
