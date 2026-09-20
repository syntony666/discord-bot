import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { ConfirmationManager } from './confirmation.manager';
import { ConfirmationConfig, ConfirmationHandler } from './confirmation.types';
import { _setConfirmationStrategy } from './confirmation.helper';

export class ConfirmationStrategy {
  private manager: ConfirmationManager;

  constructor() {
    this.manager = new ConfirmationManager();
    _setConfirmationStrategy(this);
  }

  async handle(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    await this.manager.handle(actions, interaction);
  }

  async createConfirmation<TData = any>(
    actions: DiscordActions,
    interaction: BotInteraction,
    config: ConfirmationConfig<TData>,
    handler: ConfirmationHandler<TData>
  ): Promise<string> {
    return this.manager.createConfirmation(actions, interaction, config, handler);
  }

  destroy(): void {
    this.manager.destroy();
  }
}
