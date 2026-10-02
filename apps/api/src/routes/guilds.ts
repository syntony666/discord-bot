import { Hono } from 'hono';
import { ApiError, GuildTier } from '@discord-bot/shared';
import { GuildModule } from '../modules/guild.module';
import { guildId, jsonOr404 } from './helpers';

const TIERS = Object.values(GuildTier) as string[];

export function guildRoutes(module: GuildModule) {
  const routes = new Hono();

  routes.get('/', async (c) => c.json(await module.listGuilds()));

  routes.post('/ensure', async (c) => {
    const body = await c.req.json<{ guildId: string; guildName?: string }>();
    return c.json(await module.ensureGuild(body.guildId, body.guildName));
  });

  routes.get('/:guildId', async (c) => jsonOr404(c, await module.getGuild(guildId(c))));

  routes.patch('/:guildId', async (c) => {
    const body = await c.req.json<{ tier?: string }>();
    if (!body.tier || !TIERS.includes(body.tier)) {
      throw new ApiError(400, `tier must be one of: ${TIERS.join(', ')}`, 'BAD_REQUEST');
    }
    return c.json(await module.setTier(guildId(c), body.tier as GuildTier));
  });

  routes.delete('/:guildId', async (c) => {
    await module.deleteGuild(guildId(c));
    return c.body(null, 204);
  });

  return routes;
}
