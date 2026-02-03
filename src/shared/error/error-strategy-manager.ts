import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ErrorStrategy } from './strategies/error.strategy';
import { DiscordErrorStrategy } from './strategies/discord-error.strategy';
import { FallbackErrorStrategy } from './strategies/fallback-error.strategy';
import { ErrorContext, ErrorContexts, ErrorContextKey } from './error-contexts';
import { createLogger } from '@core/logger';
import { replyError } from 'shared/message/message.helper';

const log = createLogger('ErrorStrategyManager');

/**
 * Error Strategy Manager that handles errors using the Strategy Pattern
 */
export class ErrorStrategyManager {
  private strategies: ErrorStrategy[] = [];

  constructor() {
    // Register strategies in order of priority
    this.strategies.push(new DiscordErrorStrategy());
    this.strategies.push(new FallbackErrorStrategy());
  }

  /**
   * Handle an error using the appropriate strategy
   */
  async handleError(
    bot: Bot,
    interaction: BotInteraction,
    error: unknown,
    contextKey: ErrorContextKey
  ): Promise<void> {
    const context = ErrorContexts[contextKey];

    if (!context) {
      log.error({ contextKey, error }, 'Unknown error context key');
      await replyError(bot, interaction, {
        description: '發生未預期的錯誤，請稍後再試。',
      });
      return;
    }

    // Try each strategy until one can handle the error
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        try {
          await strategy.handle(bot, interaction, error, context);
          return;
        } catch (strategyError) {
          log.error(
            { error: strategyError, originalError: error, contextKey },
            'Error strategy failed'
          );
          // Continue to next strategy
        }
      }
    }

    // If no strategy could handle the error, fall back to generic error
    log.error({ error, contextKey }, 'No strategy could handle error');
    await replyError(bot, interaction, {
      description: context.generic,
    });
  }
}
