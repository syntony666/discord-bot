export type ErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST' | 'INTERNAL';

export interface ErrorDataResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | undefined;

  constructor(status: number, message: string, code?: ErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
