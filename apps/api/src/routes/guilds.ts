import { Hono } from 'hono';
import { GuildModule } from '../modules/guild.module';
import { guildId, jsonOr404 } from './helpers';

export function guildRoutes(module: GuildModule) {
  const routes = new Hono();

  routes.get('/', async (c) => c.json(await module.listGuilds()));

  routes.post('/ensure', async (c) => {
    const body = await c.req.json<{ guildId: string; guildName?: string }>();
    return c.json(await module.ensureGuild(body.guildId, body.guildName));
  });

  routes.get('/:guildId', async (c) =>
    jsonOr404(c, await module.getGuild(guildId(c)))
  );

  routes.delete('/:guildId', async (c) => {
    await module.deleteGuild(guildId(c));
    return c.body(null, 204);
  });

  return routes;
}
