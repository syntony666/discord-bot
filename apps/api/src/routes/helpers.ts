import { Context } from 'hono';
import { ErrorCode } from '@discord-bot/shared';

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
