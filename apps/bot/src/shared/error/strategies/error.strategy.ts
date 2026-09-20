import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { replyError } from 'shared/message/message.helper';
import { ErrorContext } from '../error-contexts';
import { createLogger } from '@core/logger';

const log = createLogger('ErrorStrategy');

export interface ErrorStrategy {
  canHandle(error: unknown): boolean;
  handle(
    actions: DiscordActions,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void>;
}

export abstract class BaseErrorStrategy implements ErrorStrategy {
  protected log = log;

  abstract canHandle(error: unknown): boolean;
  abstract handle(
    actions: DiscordActions,
    interaction: BotInteraction,
    error: unknown,
    context: ErrorContext
  ): Promise<void>;

  protected async replyError(
    actions: DiscordActions,
    interaction: BotInteraction,
    description: string
  ): Promise<void> {
    await replyError(actions, interaction, { description });
  }
}
