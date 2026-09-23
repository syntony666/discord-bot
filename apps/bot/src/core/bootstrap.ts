import { statusFeature } from '@features/status/status.feature';
import { keywordFeature } from '@features/keyword/keyword.feature';
import { memberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { guildFeature } from '@features/guild/guild.feature';
import { reactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { streamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
import type { DiscordClient } from '@discord-bot/discord-client';
import { appConfig } from '@core/config';
import { BaseColors, Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';

const log = createLogger('Bootstrap');

export async function bootstrapApp(client: DiscordClient) {
  log.info('Bootstrapping application...');

  const bot = client.createBot({
    appId: appConfig.discord.appId,
    onError: (err) => log.error({ err }, 'Bot dispatch error'),
    theme: {
      footerIconUrl: appConfig.footerIconUrl,
      colors: {
        success: Colors.SUCCESS,
        error: Colors.ERROR,
        confirm: BaseColors.ORANGE,
        info: Colors.INFO,
      },
    },
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

  return bot;
}
