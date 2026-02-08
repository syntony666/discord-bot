import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { StoredConfirmation } from '../confirmation.types';

const log = createLogger('ConfirmationState');

export interface ConfirmationState {
  enter(confirmation: StoredConfirmation): void;
  expire(confirmation: StoredConfirmation): void;
  confirm(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void>;
  cancel(confirmation: StoredConfirmation, bot: Bot, interaction: BotInteraction): Promise<void>;
  unauthorized(
    confirmation: StoredConfirmation,
    bot: Bot,
    interaction: BotInteraction
  ): Promise<void>;
}

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
