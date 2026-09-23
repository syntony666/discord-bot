import { Hono } from 'hono';
import { NotificationType, UpdateMessageInput, UpsertMessageInput } from '@discord-bot/shared';
import { MemberNotifyModule } from '../modules/member-notify.module';
import { guildId, jsonOr404 } from './helpers';

export function memberNotifyRoutes(module: MemberNotifyModule) {
  const routes = new Hono();

  routes.get('/notification-channels', async (c) => {
    const type = c.req.query('type') as NotificationType | undefined;
    if (type !== undefined) {
      return jsonOr404(c, await module.getNotificationChannel(guildId(c), type));
    }
    return c.json(await module.getNotificationChannels(guildId(c)));
  });

  routes.put('/notification-channels/:type', async (c) => {
    const body = await c.req.json<{ channelId: string }>();
    return c.json(
      await module.setNotificationChannel({
        guildId: guildId(c),
        type: c.req.param('type') as NotificationType,
        channelId: body.channelId,
      })
    );
  });

  routes.patch('/notification-channels/:type', async (c) => {
    const body = await c.req.json<{ enabled: boolean }>();
    return c.json(
      await module.toggleChannelEnabled(
        guildId(c),
        c.req.param('type') as NotificationType,
        body.enabled
      )
    );
  });

  routes.delete('/notification-channels/:type', async (c) => {
    await module.deleteNotificationChannel(guildId(c), c.req.param('type') as NotificationType);
    return c.body(null, 204);
  });

  routes.get('/member-notify-message', async (c) =>
    jsonOr404(c, await module.getMessageTemplates(guildId(c)))
  );

  routes.put('/member-notify-message', async (c) => {
    const body = await c.req.json<Omit<UpsertMessageInput, 'guildId'>>();
    return c.json(await module.upsertMessageTemplates({ ...body, guildId: guildId(c) }));
  });

  routes.patch('/member-notify-message', async (c) => {
    const body = await c.req.json<Omit<UpdateMessageInput, 'guildId'>>();
    return c.json(await module.updateMessage({ ...body, guildId: guildId(c) }));
  });

  routes.delete('/member-notify-message', async (c) => {
    await module.deleteMessageTemplates(guildId(c));
    return c.body(null, 204);
  });

  return routes;
}
