import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ConfirmationManager } from './confirmation.manager';
import { ConfirmationConfig, ConfirmationHandler } from './confirmation.types';
import { _setConfirmationStrategy } from './confirmation.helper';

/**
 * Strategy for handling confirmation button interactions.
 * Wraps ConfirmationManager and provides a consistent interface.
 */
export class ConfirmationStrategy {
  private manager: ConfirmationManager;

  constructor() {
    this.manager = new ConfirmationManager();
    _setConfirmationStrategy(this);
  }

  async handle(bot: Bot, interaction: BotInteraction): Promise<void> {
    await this.manager.handle(bot, interaction);
  }

  async createConfirmation<TData = any>(
    bot: Bot,
    interaction: BotInteraction,
    config: ConfirmationConfig<TData>,
    handler: ConfirmationHandler<TData>
  ): Promise<string> {
    return this.manager.createConfirmation(bot, interaction, config, handler);
  }

  destroy(): void {
    this.manager.destroy();
  }
}
