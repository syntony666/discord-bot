// Legacy error handling (keep for backward compatibility)
export { handleError } from './error-handler';
export { ErrorContexts } from './error-contexts';
export type { ErrorContextKey, ErrorContext } from './error-contexts';
export { PrismaErrorCodes } from './prisma-errors';
export type { PrismaErrorCode } from './prisma-errors';
export { DiscordErrorCodes, DiscordErrorMessages } from './discord-errors';
export type { DiscordErrorCode } from './discord-errors';

// New unified error handling
export { DiscordErrorHandler } from '@core/errors/discord-error.handler';
export { DiscordApiErrorCodes } from '@core/errors/discord-error-codes';
export type { DiscordApiErrorCode } from '@core/errors/discord-error-codes';
export type { ErrorContext as UnifiedErrorContext } from '@core/errors/error-context.type';
export {
  DiscordOperationError,
  DiscordPermissionError,
  DiscordResourceNotFoundError,
  DiscordRateLimitError,
} from '@core/errors/error-types';
