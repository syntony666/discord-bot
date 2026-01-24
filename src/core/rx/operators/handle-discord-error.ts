import { catchError, EMPTY, MonoTypeOperatorFunction } from 'rxjs';
import { DiscordErrorHandler } from '@core/errors/discord-error.handler';
import { ErrorContext } from '@core/errors/error-context.type';
import { createLogger } from '@core/logger';

const log = createLogger('RxErrorHandler');

/**
 * RxJS operator to handle Discord errors in Observable streams
 *
 * This operator ensures that:
 * 1. Errors are properly logged with context
 * 2. Observable streams don't terminate on errors
 * 3. Appropriate log levels are used based on error type
 *
 * @param context Error context for logging
 * @returns RxJS operator function
 *
 * @example
 * ```typescript
 * messageCreate$.pipe(
 *   mergeMap(async (message) => {
 *     await bot.helpers.sendMessage(message.channelId, { content: 'Hello' });
 *   }),
 *   handleDiscordError({ operation: 'keywordTrigger', guildId })
 * ).subscribe();
 * ```
 */
export function handleDiscordError<T>(context: ErrorContext): MonoTypeOperatorFunction<T> {
  return catchError((error) => {
    const result = DiscordErrorHandler.handle(error, context);

    const logContext = {
      ...context,
      handled: result.handled,
      shouldRetry: result.shouldRetry,
    };

    // Log based on determined log level
    if (result.logLevel === 'warn') {
      log.warn(logContext, `Discord error in Observable stream: ${error.message || error}`);
    } else {
      log.error(logContext, `Discord error in Observable stream: ${error.message || error}`);
    }

    // Return EMPTY to prevent stream termination
    return EMPTY;
  });
}
