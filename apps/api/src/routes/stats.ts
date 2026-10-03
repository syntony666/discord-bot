import { Hono } from 'hono';
import type { GuildModule } from '../modules/guild.module';

export function statsRoutes(module: GuildModule) {
  const routes = new Hono();
  routes.get('/', async (c) => c.json(await module.getStats()));
  return routes;
}
