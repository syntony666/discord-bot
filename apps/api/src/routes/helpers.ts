import { Context } from 'hono';
import { ApiError, ErrorCode, isEnumValue } from '@discord-bot/shared';

// guildId comes from the mount path (`/api/v1/guilds/:guildId`), so it is
// always present at runtime even though the type is `string | undefined`.
export function guildId(c: Context): string {
  return c.req.param('guildId')!;
}

export function jsonOr404(c: Context, data: unknown) {
  if (data == null) {
    return c.json(
      { error: { code: 'NOT_FOUND' satisfies ErrorCode, message: 'Resource not found' } },
      404
    );
  }
  return c.json(data);
}

// Path param validated against a shared enum object (`as const`).
export function enumParam<E extends Record<string, string>>(
  c: Context,
  name: string,
  e: E
): E[keyof E] {
  const value = c.req.param(name);
  if (!isEnumValue(e, value)) {
    throw new ApiError(
      400,
      `${name} must be one of: ${Object.values(e).join(', ')}`,
      'BAD_REQUEST'
    );
  }
  return value;
}

// Optional query param; undefined stays undefined, an invalid value is a 400.
export function enumQuery<E extends Record<string, string>>(
  c: Context,
  name: string,
  e: E
): E[keyof E] | undefined {
  const value = c.req.query(name);
  if (value === undefined) {
    return undefined;
  }
  if (!isEnumValue(e, value)) {
    throw new ApiError(
      400,
      `${name} must be one of: ${Object.values(e).join(', ')}`,
      'BAD_REQUEST'
    );
  }
  return value;
}

// Required query param; a missing value is a 400 rather than an empty-string query.
export function requireQuery(c: Context, name: string): string {
  const value = c.req.query(name);
  if (value === undefined) {
    throw new ApiError(400, `missing query param: ${name}`, 'BAD_REQUEST');
  }
  return value;
}

// `body` is `object` so interface-typed json bodies are assignable
// (interfaces lack implicit index signatures required by Record).
const fieldOf = (body: object, field: string): unknown =>
  (body as Record<string, unknown> | null)?.[field];

export function requireFields(body: object, ...fields: string[]): void {
  for (const field of fields) {
    if (fieldOf(body, field) === undefined) {
      throw new ApiError(400, `missing field: ${field}`, 'BAD_REQUEST');
    }
  }
}

// Body field validated against a shared enum object.
export function enumBody<E extends Record<string, string>>(
  body: object,
  field: string,
  e: E
): E[keyof E];
export function enumBody<E extends Record<string, string>>(
  body: object,
  field: string,
  e: E,
  opts: { optional: true }
): E[keyof E] | undefined;
export function enumBody<E extends Record<string, string>>(
  body: object,
  field: string,
  e: E,
  opts?: { optional?: boolean }
): E[keyof E] | undefined {
  const value = fieldOf(body, field);
  if (value === undefined) {
    if (opts?.optional) return undefined;
    throw new ApiError(400, `missing field: ${field}`, 'BAD_REQUEST');
  }
  if (!isEnumValue(e, value)) {
    throw new ApiError(
      400,
      `${field} must be one of: ${Object.values(e).join(', ')}`,
      'BAD_REQUEST'
    );
  }
  return value;
}

// Body field validated against a literal union (e.g. 'join' | 'leave').
export function oneOfBody<T extends string>(body: object, field: string, allowed: readonly T[]): T {
  const value = fieldOf(body, field);
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ApiError(400, `${field} must be one of: ${allowed.join(', ')}`, 'BAD_REQUEST');
  }
  return value as T;
}

// Optional boolean body field must be an actual boolean when present.
export function boolBody(body: object, field: string): boolean | undefined {
  const value = fieldOf(body, field);
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new ApiError(400, `${field} must be a boolean`, 'BAD_REQUEST');
  }
  return value;
}
