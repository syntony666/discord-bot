import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { BaseConfirmationState } from './confirmation.state';
import { StoredConfirmation } from '../confirmation.types';

/**
 * Pending state - confirmation is waiting for user action
 */
export class PendingState extends BaseConfirmationState {
  enter(confirmation: StoredConfirmation): void {
    // No special action when entering pending state
    this.log.debug({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation entered pending state');
  }

  expire(confirmation: StoredConfirmation): void {
    // Call expire handler if available
    if (confirmation.handler.onExpire) {
      confirmation.handler.onExpire(this.getConfirmationId(confirmation), confirmation.data);
    }
    this.log.info({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation expired');
  }

  async confirm(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void> {
    try {
      await confirmation.handler.onConfirm(bot, interaction, confirmation.data);
      this.log.info({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation confirmed');
    } catch (error) {
      this.log.error(
        { error, confirmationType: confirmation.confirmationType },
        'Confirmation handler failed'
      );
    }
  }

  async cancel(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void> {
    if (confirmation.handler.onCancel) {
      try {
        await confirmation.handler.onCancel(bot, interaction, confirmation.data);
      } catch (error) {
        this.log.error({ error, confirmationType: confirmation.confirmationType }, 'Cancel handler failed');
      }
    } else {
      // Use replyWarning with isEdit: true for default cancel message
      const { replyWarning } = await import('shared/message/message.helper');
      await replyWarning(bot, interaction, {
        title: '已取消',
        description: '操作已取消。',
        components: [],
        isEdit: true,
      });
    }
    this.log.info({ confirmationId: this.getConfirmationId(confirmation) }, 'Confirmation cancelled');
  }

  private getConfirmationId(confirmation: StoredConfirmation): string {
    // Extract confirmation ID from stored data (would be passed from manager)
    return 'confirmation-id'; // This would be passed from the manager
  }
}
