import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ErrorStrategyManager } from './error-strategy-manager';
import { ErrorContextKey } from './error-contexts';
import { createLogger } from '@core/logger';
import { replyError } from 'shared/message/message.helper';

const log = createLogger('ErrorHandler');

// Global strategy manager instance
const errorStrategyManager = new ErrorStrategyManager();

/**
 * Unified error handler with contextual error messages.
 *
 * This handler provides a centralized way to handle errors across all commands,
 * using the Strategy Pattern to handle different types of errors:
 * - Discord API errors
 * - Prisma database errors
 * - Context-specific custom messages
 *
 * @param bot Bot instance
 * @param interaction User interaction
 * @param error The caught error
 * @param contextKey Key to lookup context-specific error messages
 *
 * @example
 * ```typescript
 * try {
 *   await lastValueFrom(module.createRule$(...));
 * } catch (error) {
 *   await handleError(bot, interaction, error, 'keywordAdd');
 * }
 * ```
 */
export async function handleError(
  bot: Bot,
  interaction: BotInteraction,
  error: unknown,
  contextKey: ErrorContextKey
): Promise<void> {
  try {
    await errorStrategyManager.handleError(bot, interaction, error, contextKey);
  } catch (handlerError) {
    log.error(
      { error: handlerError, originalError: error, contextKey },
      'Error handler itself failed'
    );

    // Ultimate fallback
    await replyError(bot, interaction, {
      description: '發生未預期的錯誤，請稍後再試。',
    });
  }
}
