import { createLogger } from '@core/logger';
import {
  DiscordApiErrorCodes,
  isPermissionError,
  isResourceNotFoundError,
  isRateLimitError,
} from './discord-error-codes';
import { ErrorContext, extractErrorContext } from './error-context.type';
import {
  DiscordOperationError,
  DiscordPermissionError,
  DiscordResourceNotFoundError,
  DiscordRateLimitError,
} from './error-types';

const log = createLogger('DiscordErrorHandler');

/**
 * Log levels based on error type
 */
type LogLevel = 'warn' | 'error';

/**
 * Result of error handling
 */
export interface ErrorHandlingResult {
  /** Whether the error was handled */
  handled: boolean;

  /** User-friendly error message */
  userMessage?: string;

  /** Log level to use */
  logLevel: LogLevel;

  /** Whether the operation should be retried */
  shouldRetry: boolean;
}

/**
 * Unified Discord error handler
 */
export class DiscordErrorHandler {
  /**
   * Handle Discord API errors and determine appropriate actions
   */
  static handle(error: unknown, context: ErrorContext): ErrorHandlingResult {
    const errorCode = this.extractErrorCode(error);
    const errorContext = {
      ...context,
      ...extractErrorContext(error),
    };

    // No error code - treat as generic error
    if (errorCode === null) {
      log.error(errorContext, 'Non-Discord error occurred');
      return {
        handled: false,
        logLevel: 'error',
        shouldRetry: false,
      };
    }

    // Resource not found errors (10xxx)
    if (isResourceNotFoundError(errorCode)) {
      return this.handleResourceNotFound(errorCode, errorContext);
    }

    // Permission errors (50xxx)
    if (isPermissionError(errorCode)) {
      return this.handlePermissionError(errorCode, errorContext);
    }

    // Rate limit errors
    if (isRateLimitError(errorCode)) {
      return this.handleRateLimitError(errorContext);
    }

    // Other Discord errors
    log.error(errorContext, `Unhandled Discord error: ${errorCode}`);
    return {
      handled: false,
      userMessage: '發生 Discord API 錯誤,請稍後再試。',
      logLevel: 'error',
      shouldRetry: false,
    };
  }

  /**
   * Handle resource not found errors (10xxx)
   */
  private static handleResourceNotFound(
    errorCode: number,
    context: Record<string, any>
  ): ErrorHandlingResult {
    let userMessage = '資源不存在或已被刪除。';

    switch (errorCode) {
      case DiscordApiErrorCodes.UNKNOWN_MESSAGE:
        userMessage = '該訊息已被刪除或不存在。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_CHANNEL:
        userMessage = '該頻道已被刪除或不存在。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_ROLE:
        userMessage = '該身分組已被刪除或不存在。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_EMOJI:
        userMessage = '該 emoji 不存在或無法使用。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_MEMBER:
        userMessage = '該成員不存在或已離開伺服器。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_USER:
        userMessage = '該使用者不存在。';
        break;
      case DiscordApiErrorCodes.UNKNOWN_GUILD:
        userMessage = '該伺服器不存在或 Bot 不在其中。';
        break;
    }

    log.warn(context, `Discord resource not found: ${errorCode}`);

    return {
      handled: true,
      userMessage,
      logLevel: 'warn',
      shouldRetry: false,
    };
  }

  /**
   * Handle permission errors (50xxx)
   */
  private static handlePermissionError(
    errorCode: number,
    context: Record<string, any>
  ): ErrorHandlingResult {
    let userMessage = '權限不足。';

    switch (errorCode) {
      case DiscordApiErrorCodes.MISSING_PERMISSIONS:
        userMessage = 'Bot 缺少必要的權限來執行此操作。';
        break;
      case DiscordApiErrorCodes.MISSING_ACCESS:
        userMessage = 'Bot 無法存取該資源。';
        break;
      case DiscordApiErrorCodes.CANNOT_MESSAGE_USER:
        userMessage = '無法傳送訊息給該使用者(可能關閉了私訊)。';
        break;
      case DiscordApiErrorCodes.CANNOT_SEND_EMPTY_MESSAGE:
        userMessage = '無法傳送空訊息。';
        break;
      case DiscordApiErrorCodes.INVALID_FORM_BODY:
        userMessage = '資料格式不正確,請檢查輸入內容。';
        break;
      case DiscordApiErrorCodes.CANNOT_EDIT_MESSAGE_BY_OTHER:
        userMessage = '無法編輯其他人的訊息。';
        break;
      case DiscordApiErrorCodes.MESSAGE_TOO_OLD_TO_BULK_DELETE:
        userMessage = '訊息太舊無法批次刪除(超過 14 天)。';
        break;
    }

    log.error(context, `Discord permission error: ${errorCode}`);

    return {
      handled: true,
      userMessage,
      logLevel: 'error',
      shouldRetry: false,
    };
  }

  /**
   * Handle rate limit errors
   */
  private static handleRateLimitError(context: Record<string, any>): ErrorHandlingResult {
    const retryAfter = context.retryAfter || 'unknown';
    log.warn(context, `Rate limit hit. Retry after: ${retryAfter}ms`);

    return {
      handled: true,
      userMessage: '操作過於頻繁,請稍後再試。',
      logLevel: 'warn',
      shouldRetry: true,
    };
  }

  /**
   * Extract error code from error object
   */
  private static extractErrorCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;
    if ('code' in error && typeof error.code === 'number') {
      return error.code;
    }
    return null;
  }

  /**
   * Convert error to custom error type
   */
  static toCustomError(error: unknown, context: ErrorContext): Error {
    const errorCode = this.extractErrorCode(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorCode === null) {
      return new DiscordOperationError(errorMessage, undefined, context);
    }

    if (isResourceNotFoundError(errorCode)) {
      return new DiscordResourceNotFoundError('Resource', String(errorCode), context);
    }

    if (isPermissionError(errorCode)) {
      return new DiscordPermissionError('Required permission', context);
    }

    if (isRateLimitError(errorCode)) {
      const retryAfter = extractErrorContext(error).retryAfter || 0;
      return new DiscordRateLimitError(retryAfter, context);
    }

    return new DiscordOperationError(errorMessage, errorCode, context);
  }
}
