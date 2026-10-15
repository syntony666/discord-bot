import { Hono } from 'hono';
import {
  CreateKeywordRuleInput,
  KeywordMatchType,
  UpdateKeywordRuleInput,
} from '@discord-bot/shared';
import { KeywordModule } from '../modules/keyword.module';
import { enumBody, guildId, jsonOr404, requireFields } from './helpers';

export function keywordRuleRoutes(module: KeywordModule) {
  const routes = new Hono();

  routes.get('/', async (c) => {
    const query = c.req.query('q');
    const rules =
      c.req.query('runtime') !== undefined
        ? await module.getRulesByGuild(guildId(c))
        : query !== undefined
          ? await module.searchRules(guildId(c), query)
          : await module.getRulesForList(guildId(c));
    return c.json(rules);
  });

  routes.post('/', async (c) => {
    const body = await c.req.json<Omit<CreateKeywordRuleInput, 'guildId'>>();
    requireFields(body, 'pattern', 'matchType', 'response', 'editorId');
    const matchType = enumBody(body, 'matchType', KeywordMatchType);
    return c.json(await module.createRule({ ...body, matchType, guildId: guildId(c) }), 201);
  });

  routes.get('/:pattern', async (c) =>
    jsonOr404(c, await module.getRuleByPattern(guildId(c), c.req.param('pattern')))
  );

  routes.put('/:pattern', async (c) => {
    const body = await c.req.json<Omit<UpdateKeywordRuleInput, 'guildId' | 'pattern'>>();
    requireFields(body, 'response', 'editorId');
    const matchType = enumBody(body, 'matchType', KeywordMatchType, { optional: true });
    return c.json(
      await module.updateRule({
        ...body,
        matchType,
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
