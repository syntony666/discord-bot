import { createRequest } from '@discord-bot/shared';
import { createBot } from '@discord-bot/discord-client';
import type { DiscordClient } from '@discord-bot/discord-client';
import { statusFeature } from '@features/status/status.feature';
import { keywordFeature } from '@features/keyword/keyword.feature';
import { memberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { appConfig } from '@core/config';
import { createGuildModule } from '@features/guild/guild.module';
import { createKeywordModule } from '@features/keyword/keyword.module';
import { createMemberNotifyModule } from '@features/member-notify/member-notify.module';
import { createReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { createStreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { guildFeature } from '@features/guild/guild.feature';
import { createLogger } from '@discord-bot/shared';
import { reactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { streamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
import { createSchedulerService } from '@core/scheduler';

const log = createLogger('Bootstrap');

export async function bootstrapApp(client: DiscordClient) {
  log.info('Bootstrapping application...');

  const request = createRequest(appConfig.api.url);

  // Create and start scheduler
  const scheduler = createSchedulerService();
  scheduler.start();

  // ========== Modules ==========
  const guildModule = createGuildModule(request);
  const keywordModule = createKeywordModule(request);
  const memberNotifyModule = createMemberNotifyModule(request);
  const reactionRoleModule = createReactionRoleModule(request);
  const streamNotifyModule = createStreamNotifyModule(request);

  const deps = {
    discord: client.helpers,
    modules: {
      guild: guildModule,
      keyword: keywordModule,
      memberNotify: memberNotifyModule,
      reactionRole: reactionRoleModule,
      streamNotify: streamNotifyModule,
    },
    scheduler,
  };

  const bot = createBot(client, {
    appId: appConfig.discord.appId,
    deps,
    onError: (err) => log.error({ err }, 'Bot dispatch error'),
  });
  bot.register(
    statusFeature,
    keywordFeature,
    memberNotifyFeature,
    guildFeature,
    streamNotifyFeature,
    reactionRoleFeature
  );
  await bot.sync();

  log.info('Application bootstrapped successfully');

  return { bot, scheduler };
}
