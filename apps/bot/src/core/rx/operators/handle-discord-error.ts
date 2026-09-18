import { catchError, EMPTY, MonoTypeOperatorFunction } from 'rxjs';
import { DiscordErrorHandler } from '@core/errors/discord-error.handler';
import { ErrorContext } from '@core/errors/error-context.type';
import { createLogger } from '@core/logger';

const log = createLogger('RxErrorHandler');

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
