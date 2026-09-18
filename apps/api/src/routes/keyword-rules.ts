import { Hono } from 'hono';
import { CreateKeywordRuleInput, UpdateKeywordRuleInput } from '@discord-bot/shared';
import { KeywordModule } from '../modules/keyword.module';
import { guildId, jsonOr404 } from './helpers';

export function keywordRuleRoutes(module: KeywordModule) {
  const routes = new Hono();

  routes.get('/', async (c) => {
    const rules =
      c.req.query('runtime') !== undefined
        ? await module.getRulesByGuild(guildId(c))
        : await module.getRulesForList(guildId(c));
    return c.json(rules);
  });

  routes.post('/', async (c) => {
    const body = await c.req.json<Omit<CreateKeywordRuleInput, 'guildId'>>();
    return c.json(await module.createRule({ ...body, guildId: guildId(c) }), 201);
  });

  routes.get('/:pattern', async (c) =>
    jsonOr404(c, await module.getRuleByPattern(guildId(c), c.req.param('pattern')))
  );

  routes.put('/:pattern', async (c) => {
    const body = await c.req.json<Omit<UpdateKeywordRuleInput, 'guildId' | 'pattern'>>();
    return c.json(
      await module.updateRule({
        ...body,
        guildId: guildId(c),
        pattern: c.req.param('pattern'),
      })
    );
  });

  routes.delete('/:pattern', async (c) => {
    await module.deleteRule(guildId(c), c.req.param('pattern'));
    return c.body(null, 204);
  });

  return routes;
}
