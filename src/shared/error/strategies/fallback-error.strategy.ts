import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { replyAutoError } from 'shared/message/message.helper';
import { BaseErrorStrategy } from './error.strategy';
import { ErrorContext } from '../error-contexts';

/**
 * Strategy for handling all other errors (Prisma, generic, etc.)
 */
export class FallbackErrorStrategy extends BaseErrorStrategy {
  canHandle(error: unknown): boolean {
    // This strategy handles everything that other strategies don't handle
    return true;
  }

  async handle(
    bot: Bot,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void> {
    // Fallback to replyAutoError for Prisma and other errors
    const customMessages = {
      duplicate: context.duplicate,
      notFound: context.notFound,
      permission: context.discordMissingPermissions,
      generic: context.generic,
    };

    await replyAutoError(bot, interaction, error, customMessages);
  }
}
