/**
 * Error context for structured logging and error handling
 */
export interface ErrorContext {
  /** Guild ID where the error occurred */
  guildId?: string;

  /** User ID who triggered the operation */
  userId?: string;

  /** Channel ID related to the error */
  channelId?: string;

  /** Message ID related to the error */
  messageId?: string;

  /** Operation identifier (e.g., 'keywordAdd', 'reactionRolePanelCreate') */
  operation: string;

  /** Additional context fields */
  [key: string]: any;
}

/**
 * Extract error context from various error objects
 */
export function extractErrorContext(error: unknown): Record<string, any> {
  if (!error || typeof error !== 'object') {
    return {};
  }

  const context: Record<string, any> = {};

  // Extract Discord API error code
  if ('code' in error && typeof error.code === 'number') {
    context.discordErrorCode = error.code;
  }

  // Extract error message
  if ('message' in error && typeof error.message === 'string') {
    context.errorMessage = error.message;
  }

  // Extract HTTP status
  if ('status' in error && typeof error.status === 'number') {
    context.httpStatus = error.status;
  }

  // Extract request ID if available
  if ('requestId' in error && typeof error.requestId === 'string') {
    context.requestId = error.requestId;
  }

  return context;
}
