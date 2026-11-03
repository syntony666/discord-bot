import { Hono } from 'hono';
import { AutoFeatureType } from '@discord-bot/shared';
import { AutoModule } from '../modules/auto.module';
import { boolBody, enumParam, guildId, jsonOr404, requireFields } from './helpers';

export function autoRoutes(module: AutoModule) {
  const routes = new Hono();

  routes.get('/auto-features/:feature', async (c) =>
    jsonOr404(c, await module.getFeature(guildId(c), enumParam(c, 'feature', AutoFeatureType)))
  );

  routes.put('/auto-features/:feature', async (c) => {
    const body = await c.req.json<object>();
    requireFields(body, 'enabled');
    const enabled = boolBody(body, 'enabled')!;
    return c.json(
      await module.setFeature(guildId(c), enumParam(c, 'feature', AutoFeatureType), enabled)
    );
  });

  return routes;
}
