import { Hono } from 'hono';
import {
  CreateStreamNotifyConfigInput,
  CreateStreamWatcherInput,
  StreamPlatform,
  UpdateStreamNotifyConfigInput,
} from '@discord-bot/shared';
import { StreamNotifyModule, StreamWatcherPatch } from '../modules/stream-notify.module';
import { guildId, jsonOr404 } from './helpers';

export function streamNotifyRoutes(module: StreamNotifyModule) {
  const routes = new Hono();

  routes.get('/stream-notify-config', async (c) =>
    jsonOr404(c, await module.getConfig(guildId(c)))
  );

  routes.post('/stream-notify-config', async (c) => {
    const body = await c.req.json<Omit<CreateStreamNotifyConfigInput, 'guildId'>>();
    return c.json(await module.createConfig({ ...body, guildId: guildId(c) }), 201);
  });

  routes.patch('/stream-notify-config', async (c) => {
    const body = await c.req.json<UpdateStreamNotifyConfigInput>();
    return c.json(await module.updateConfig(guildId(c), body));
  });

  routes.delete('/stream-notify-config', async (c) => {
    await module.deleteConfig(guildId(c));
    return c.body(null, 204);
  });

  routes.get('/stream-watchers', async (c) => c.json(await module.getWatchers(guildId(c))));

  routes.post('/stream-watchers', async (c) => {
    const body = await c.req.json<Omit<CreateStreamWatcherInput, 'guildId'>>();
    return c.json(await module.addWatcher({ ...body, guildId: guildId(c) }), 201);
  });

  routes.get('/stream-watchers/:platform/:platformId', async (c) =>
    jsonOr404(
      c,
      await module.getWatcher(
        guildId(c),
        c.req.param('platform') as StreamPlatform,
        c.req.param('platformId')
      )
    )
  );

  routes.delete('/stream-watchers/:platform/:platformId', async (c) => {
    await module.removeWatcher(
      guildId(c),
      c.req.param('platform') as StreamPlatform,
      c.req.param('platformId')
    );
    return c.body(null, 204);
  });

  return routes;
}

export function streamWatcherRoutes(module: StreamNotifyModule) {
  const routes = new Hono();

  routes.get('/', async (c) => c.json(await module.getAllWatchers()));

  routes.patch('/:id', async (c) => {
    const body = await c.req.json<StreamWatcherPatch>();
    return c.json(await module.updateWatcher(c.req.param('id'), body));
  });

  return routes;
}
