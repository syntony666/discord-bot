import { Hono } from 'hono';
import { ApiError, GuildTier, LimitFeature } from '@discord-bot/shared';
import type { GuildModule } from '../modules/guild.module';

const TIERS = Object.values(GuildTier) as string[];
const FEATURES = Object.values(LimitFeature) as string[];

export function tierLimitRoutes(module: GuildModule) {
  const routes = new Hono();

  routes.get('/', async (c) => c.json(await module.listTierLimits()));

  routes.patch('/:tier', async (c) => {
    const tier = c.req.param('tier');
    if (!TIERS.includes(tier)) {
      throw new ApiError(400, `tier must be one of: ${TIERS.join(', ')}`, 'BAD_REQUEST');
    }
    const body = await c.req.json<Record<string, unknown>>();
    const patch: Record<string, number> = {};
    for (const key of FEATURES) {
      const v = body[key];
      if (v === undefined) continue;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < -1) {
        throw new ApiError(400, `${key} must be an integer >= -1`, 'BAD_REQUEST');
      }
      patch[key] = v;
    }
    if (Object.keys(patch).length === 0) {
      throw new ApiError(400, 'provide at least one limit field', 'BAD_REQUEST');
    }
    return c.json(await module.setTierLimit(tier as GuildTier, patch));
  });

  return routes;
}
