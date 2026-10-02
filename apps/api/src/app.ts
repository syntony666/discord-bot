import { Hono } from 'hono';
import { ApiError, logger } from '@discord-bot/shared';
import { Prisma } from './.prisma/client';
import { prisma } from './db/client';
import { createBotStateModule } from './modules/bot-state.module';
import { createGuildModule } from './modules/guild.module';
import { createKeywordModule } from './modules/keyword.module';
import { createMemberNotifyModule } from './modules/member-notify.module';
import { createReactionRoleModule } from './modules/reaction-role.module';
import { createStreamNotifyModule } from './modules/stream-notify.module';
import { botStateRoutes } from './routes/bot-state';
import { guildRoutes } from './routes/guilds';
import { keywordRuleRoutes } from './routes/keyword-rules';
import { memberNotifyRoutes } from './routes/member-notify';
import { reactionRoleRoutes } from './routes/reaction-roles';
import { streamNotifyRoutes, streamWatcherRoutes } from './routes/stream-notify';
import { tierLimitRoutes } from './routes/tier-limits';

const guildModule = createGuildModule(prisma);
const keywordModule = createKeywordModule(prisma);
const memberNotifyModule = createMemberNotifyModule(prisma);
const reactionRoleModule = createReactionRoleModule(prisma);
const streamNotifyModule = createStreamNotifyModule(prisma);
const botStateModule = createBotStateModule(prisma);

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'discord-bot-api' }));

app.route('/api/v1/guilds', guildRoutes(guildModule));
app.route('/api/v1/guilds/:guildId/keyword-rules', keywordRuleRoutes(keywordModule));
app.route('/api/v1/guilds/:guildId', memberNotifyRoutes(memberNotifyModule));
app.route('/api/v1/guilds/:guildId', reactionRoleRoutes(reactionRoleModule));
app.route('/api/v1/guilds/:guildId', streamNotifyRoutes(streamNotifyModule));
app.route('/api/v1/stream-watchers', streamWatcherRoutes(streamNotifyModule));
app.route('/api/v1/tier-limits', tierLimitRoutes(guildModule));
app.route('/api/v1/bot-state', botStateRoutes(botStateModule));

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json(
      { error: { code: error.code ?? 'INTERNAL', message: error.message } },
      error.status as 400
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
    }
    if (error.code === 'P2002') {
      return c.json({ error: { code: 'CONFLICT', message: 'Resource already exists' } }, 409);
    }
  }
  logger.error({ error, method: c.req.method, path: c.req.path }, 'Unhandled request error');
  return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
});
