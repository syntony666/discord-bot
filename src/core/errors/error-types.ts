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

export class DiscordResourceNotFoundError extends DiscordOperationError {
  constructor(resource: string, resourceId: string, context?: Record<string, any>) {
    super(`${resource} not found: ${resourceId}`, undefined, context);
    this.name = 'DiscordResourceNotFoundError';
  }
}

export class DiscordPermissionError extends DiscordOperationError {
  constructor(permission: string, context?: Record<string, any>) {
    super(`Missing permission: ${permission}`, undefined, context);
    this.name = 'DiscordPermissionError';
  }
}

export class DiscordRateLimitError extends DiscordOperationError {
  constructor(retryAfter: number, context?: Record<string, any>) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`, undefined, context);
    this.name = 'DiscordRateLimitError';
  }
}
