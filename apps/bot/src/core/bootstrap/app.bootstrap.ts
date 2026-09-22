import { createRequest } from '@discord-bot/shared';
import type { DiscordClient } from '@discord-bot/discord-client';
import { statusFeature } from '@features/status/status.feature';
import { keywordFeature } from '@features/keyword/keyword.feature';
import { memberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { appConfig } from '@core/config';
import { createGuildApi } from '@features/guild/guild.api';
import { createKeywordApi } from '@features/keyword/keyword.api';
import { createMemberNotifyApi } from '@features/member-notify/member-notify.api';
import { createReactionRoleApi } from '@features/reaction-role/reaction-role.api';
import { createStreamNotifyApi } from '@features/stream-notify/stream-notify.api';
import { guildFeature } from '@features/guild/guild.feature';
import { createLogger } from '@discord-bot/shared';
import { reactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { streamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
import { createScheduler } from '@core/scheduler';

const log = createLogger('Bootstrap');

export async function bootstrapApp(client: DiscordClient) {
  log.info('Bootstrapping application...');

  const request = createRequest(appConfig.api.url);

  const scheduler = createScheduler();

  // ========== Api ==========
  const guildApi = createGuildApi(request);
  const keywordApi = createKeywordApi(request);
  const memberNotifyApi = createMemberNotifyApi(request);
  const reactionRoleApi = createReactionRoleApi(request);
  const streamNotifyApi = createStreamNotifyApi(request);

  const deps = {
    discord: client.helpers,
    api: {
      guild: guildApi,
      keyword: keywordApi,
      memberNotify: memberNotifyApi,
      reactionRole: reactionRoleApi,
      streamNotify: streamNotifyApi,
    },
    scheduler,
  };

  const bot = client.createBot({
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
