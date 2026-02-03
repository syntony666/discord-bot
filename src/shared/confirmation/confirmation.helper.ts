import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ConfirmationConfig, ConfirmationHandler } from './confirmation.types';

let confirmationStrategy: any = null;

/**
 * @internal
 */
export function _setConfirmationStrategy(strategy: any): void {
  confirmationStrategy = strategy;
}

/**
 * Create a confirmation request with button interactions.
 *
 * @example
 * ```typescript
 * await createConfirmation(bot, interaction, {
 *   confirmationType: 'delete_keyword',
 *   userId: interaction.user.id,
 *   guildId: interaction.guildId,
 *   data: { keywordId: '123' },
 *   embed: {
 *     title: '確認刪除',
 *     description: '此操作無法復原',
 *   },
 * }, {
 *   onConfirm: async (bot, interaction, data) => {
 *     // Delete keyword
 *   },
 * });
 * ```
 */
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
