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

export function requireFields(body: Record<string, unknown>, ...fields: string[]): void {
  for (const field of fields) {
    if (body == null || body[field] === undefined) {
      throw new ApiError(400, `missing field: ${field}`, 'BAD_REQUEST');
    }
  }
}
