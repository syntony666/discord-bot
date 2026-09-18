import { ApiError, ErrorDataResponse } from './error.type';

export type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export function createRequest(baseUrl: string): ApiRequest {
  return async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers:
        init.body !== undefined
          ? { 'Content-Type': 'application/json', ...init.headers }
          : init.headers,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as
        | ErrorDataResponse
        | undefined;
      throw new ApiError(
        response.status,
        body?.error?.message ?? response.statusText,
        body?.error?.code
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };
}

export function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) =>
    error instanceof ApiError && error.status === 404 ? null : Promise.reject(error)
  );
}
