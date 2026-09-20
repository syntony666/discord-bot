import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { BaseConfirmationState } from './confirmation.state';
import { StoredConfirmation } from '../confirmation.types';

export class CompletedState extends BaseConfirmationState {
  enter(confirmation: StoredConfirmation): void {
    // No action needed when entering completed state
    this.log.debug({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation entered completed state');
  }

  expire(confirmation: StoredConfirmation): void {
    // No action needed for completed confirmations
  }

  async confirm(confirmation: StoredConfirmation, actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    await this.sendAlreadyProcessedMessage(actions, interaction);
  }

  async cancel(confirmation: StoredConfirmation, actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    await this.sendAlreadyProcessedMessage(actions, interaction);
  }

  private async sendAlreadyProcessedMessage(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    const { replyError } = await import('shared/message/message.helper');
    await replyError(actions, interaction, {
      title: '已處理',
      description: '此確認請求已被處理,請重新執行指令。',
      ephemeral: true,
    });
  }

  private getConfirmationId(confirmation: StoredConfirmation): string {
    return 'confirmation-id'; // This would be passed from the manager
  }
}
