import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { replyError } from 'shared/message/message.helper';
import { ErrorContext } from '../error-contexts';
import { createLogger } from '@core/logger';

const log = createLogger('ErrorStrategy');

export interface ErrorStrategy {
  canHandle(error: unknown): boolean;
  handle(
    bot: Bot,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void>;
}

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
