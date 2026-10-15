import { Hono } from 'hono';
import type { BotStateModule } from '../modules/bot-state.module';
import { jsonOr404, requireFields } from './helpers';

export function botStateRoutes(module: BotStateModule) {
  const routes = new Hono();

  routes.get('/:key', async (c) => jsonOr404(c, await module.get(c.req.param('key'))));

  routes.put('/:key', async (c) => {
    const body = await c.req.json<{ value: string }>();
    requireFields(body, 'value');
    return c.json(await module.set(c.req.param('key'), body.value));
  });

  return routes;
}
