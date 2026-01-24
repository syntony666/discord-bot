/**
 * Core error handling exports
 */

export { DiscordErrorHandler } from './discord-error.handler';
export {
  DiscordApiErrorCodes,
  isPermissionError,
  isResourceNotFoundError,
  isRateLimitError,
} from './discord-error-codes';
export type { DiscordApiErrorCode } from './discord-error-codes';
export type { ErrorContext } from './error-context.type';
export { extractErrorContext } from './error-context.type';
export {
  DiscordOperationError,
  DiscordPermissionError,
  DiscordResourceNotFoundError,
  DiscordRateLimitError,
} from './error-types';
