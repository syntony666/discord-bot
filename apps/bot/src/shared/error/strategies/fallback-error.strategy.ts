import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { replyAutoError } from 'shared/message/message.helper';
import { BaseErrorStrategy } from './error.strategy';
import { ErrorContext } from '../error-contexts';

export class FallbackErrorStrategy extends BaseErrorStrategy {
  canHandle(error: any): boolean {
    // This strategy handles everything that other strategies don't handle
    return true;
  }

  async handle(
    bot: Bot,
    interaction: BotInteraction,
    error: any,
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
