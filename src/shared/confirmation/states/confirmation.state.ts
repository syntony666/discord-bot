import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { StoredConfirmation } from '../confirmation.types';

const log = createLogger('ConfirmationState');

/**
 * Base interface for confirmation states
 */
export interface ConfirmationState {
  /**
   * Called when entering this state
   */
  enter(confirmation: StoredConfirmation): void;

  /**
   * Called when confirmation expires
   */
  expire(confirmation: StoredConfirmation): void;

  /**
   * Called when user confirms
   */
  confirm(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void>;

  /**
   * Called when user cancels
   */
  cancel(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void>;

  /**
   * Called when unauthorized user tries to interact
   */
  unauthorized(
    confirmation: StoredConfirmation,
    bot: Bot,
    interaction: BotInteraction
  ): Promise<void>;
}

/**
 * Base class for confirmation states with common functionality
 */
export abstract class BaseConfirmationState implements ConfirmationState {
  protected log = log;

  abstract enter(confirmation: StoredConfirmation): void;
  abstract expire(confirmation: StoredConfirmation): void;
  abstract confirm(
    confirmation: StoredConfirmation,
    bot: Bot,
    interaction: BotInteraction
  ): Promise<void>;
  abstract cancel(
    confirmation: StoredConfirmation,
    bot: Bot,
    interaction: BotInteraction
  ): Promise<void>;

  async unauthorized(
    confirmation: StoredConfirmation,
    bot: Bot,
    interaction: BotInteraction
  ): Promise<void> {
    await this.sendUnauthorizedMessage(bot, interaction);
  }

  protected async sendUnauthorizedMessage(bot: Bot, interaction: BotInteraction): Promise<void> {
    const { replyError } = await import('shared/message/message.helper');
    await replyError(bot, interaction, {
      title: '權限不足',
      description: '只有發起此操作的用戶可以確認或取消。',
      ephemeral: true,
    });
  }
}
