import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { BaseConfirmationState } from './confirmation.state';
import { StoredConfirmation } from '../confirmation.types';

export class ExpiredState extends BaseConfirmationState {
  enter(confirmation: StoredConfirmation): void {
    // No action needed when entering expired state
    this.log.debug({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation entered expired state');
  }

  expire(confirmation: StoredConfirmation): void {
    // Already expired, no action needed
  }

  async confirm(confirmation: StoredConfirmation, actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    await this.sendExpiredMessage(actions, interaction);
  }

  async cancel(confirmation: StoredConfirmation, actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    await this.sendExpiredMessage(actions, interaction);
  }

  private async sendExpiredMessage(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    const { replyError } = await import('shared/message/message.helper');
    await replyError(actions, interaction, {
      title: '確認已過期',
      description: '此確認請求已過期或已被處理,請重新執行指令。',
      ephemeral: true,
    });
  }

  private getConfirmationId(confirmation: StoredConfirmation): string {
    return 'confirmation-id'; // This would be passed from the manager
  }
}
