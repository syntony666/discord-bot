import { Hono } from 'hono';
import { ApiError, GuildTier, LimitFeature, UNLIMITED_LIMIT } from '@discord-bot/shared';
import type { GuildModule } from '../modules/guild.module';
import { enumParam } from './helpers';

const FEATURES = Object.values(LimitFeature) as string[];

export function tierLimitRoutes(module: GuildModule) {
  const routes = new Hono();

  routes.get('/', async (c) => c.json(await module.listTierLimits()));

  routes.patch('/:tier', async (c) => {
    const tier = enumParam(c, 'tier', GuildTier);
    const body = await c.req.json<Record<string, unknown>>();
    const patch: Record<string, number> = {};
    for (const key of FEATURES) {
      const v = body[key];
      if (v === undefined) continue;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < UNLIMITED_LIMIT) {
        throw new ApiError(400, `${key} must be an integer >= -1`, 'BAD_REQUEST');
      }
      patch[key] = v;
    }
    if (Object.keys(patch).length === 0) {
      throw new ApiError(400, 'provide at least one limit field', 'BAD_REQUEST');
    }
    return c.json(await module.setTierLimit(tier, patch));
  });

  return routes;
}
