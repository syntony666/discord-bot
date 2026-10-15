import { Hono } from 'hono';
import {
  CreateReactionRoleInput,
  CreateReactionRolePanelInput,
  ReactionRoleMode,
  UpdateReactionRolePanelInput,
} from '@discord-bot/shared';
import { ReactionRoleModule } from '../modules/reaction-role.module';
import { enumBody, guildId, jsonOr404, requireFields } from './helpers';

export function reactionRoleRoutes(module: ReactionRoleModule) {
  const routes = new Hono();

  routes.get('/reaction-role-panels', async (c) =>
    c.json(
      c.req.query('withRoles') === 'true'
        ? await module.getPanelsWithRoles(guildId(c))
        : await module.getPanelsByGuild(guildId(c))
    )
  );

  routes.post('/reaction-role-panels', async (c) => {
    const body = await c.req.json<Omit<CreateReactionRolePanelInput, 'guildId'>>();
    requireFields(body, 'channelId', 'messageId');
    const mode = enumBody(body, 'mode', ReactionRoleMode, { optional: true });
    return c.json(await module.createPanel({ ...body, mode, guildId: guildId(c) }), 201);
  });

  routes.get('/reaction-role-panels/:messageId', async (c) =>
    jsonOr404(c, await module.getPanel(guildId(c), c.req.param('messageId')))
  );

  routes.patch('/reaction-role-panels/:messageId', async (c) => {
    const body = await c.req.json<UpdateReactionRolePanelInput>();
    const mode = enumBody(body, 'mode', ReactionRoleMode, { optional: true });
    return c.json(
      await module.updatePanel(guildId(c), c.req.param('messageId'), { ...body, mode })
    );
  });

  routes.delete('/reaction-role-panels/:messageId', async (c) => {
    await module.deletePanel(guildId(c), c.req.param('messageId'));
    return c.body(null, 204);
  });

  routes.get('/reaction-roles', async (c) =>
    c.json(await module.getReactionRolesByMessage(guildId(c), c.req.query('messageId') ?? ''))
  );

  routes.post('/reaction-roles', async (c) => {
    const body = await c.req.json<Omit<CreateReactionRoleInput, 'guildId'>>();
    requireFields(body, 'messageId', 'emoji', 'roleId');
    return c.json(await module.createReactionRole({ ...body, guildId: guildId(c) }), 201);
  });

  routes.get('/reaction-roles/:messageId/:emoji', async (c) =>
    jsonOr404(
      c,
      await module.getReactionRole(guildId(c), c.req.param('messageId'), c.req.param('emoji'))
    )
  );

  routes.delete('/reaction-roles/:messageId/:emoji', async (c) => {
    await module.deleteReactionRole(guildId(c), c.req.param('messageId'), c.req.param('emoji'));
    return c.body(null, 204);
  });

  return routes;
}
