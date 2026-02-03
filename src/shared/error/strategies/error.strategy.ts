import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { replyError } from 'shared/message/message.helper';
import { ErrorContext } from '../error-contexts';
import { createLogger } from '@core/logger';

const log = createLogger('ErrorStrategy');

/**
 * Base interface for error handling strategies
 */
export interface ErrorStrategy {
  /**
   * Check if this strategy can handle the error
   */
  canHandle(error: unknown): boolean;

  /**
   * Handle the error and send appropriate response
   */
  handle(
    bot: Bot,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void>;
}

/**
 * Base class for error strategies with common functionality
 */
export abstract class BaseErrorStrategy implements ErrorStrategy {
  protected log = log;

  abstract canHandle(error: unknown): boolean;
  abstract handle(
    bot: Bot,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void>;

  protected async replyError(
    bot: Bot,
    interaction: BotInteraction,
    description: string
  ): Promise<void> {
    await replyError(bot, interaction, { description });
  }
}
