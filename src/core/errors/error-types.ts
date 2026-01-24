/**
 * Custom error types for better error handling
 */

/**
 * Base error class for Discord-related errors
 */
export class DiscordOperationError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DiscordOperationError';
  }
}

/**
 * Error thrown when a Discord resource is not found
 */
export class DiscordResourceNotFoundError extends DiscordOperationError {
  constructor(resource: string, resourceId: string, context?: Record<string, any>) {
    super(`${resource} not found: ${resourceId}`, undefined, context);
    this.name = 'DiscordResourceNotFoundError';
  }
}

/**
 * Error thrown when Bot lacks required permissions
 */
export class DiscordPermissionError extends DiscordOperationError {
  constructor(permission: string, context?: Record<string, any>) {
    super(`Missing permission: ${permission}`, undefined, context);
    this.name = 'DiscordPermissionError';
  }
}

/**
 * Error thrown when rate limit is hit
 */
export class DiscordRateLimitError extends DiscordOperationError {
  constructor(retryAfter: number, context?: Record<string, any>) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`, undefined, context);
    this.name = 'DiscordRateLimitError';
  }
}
