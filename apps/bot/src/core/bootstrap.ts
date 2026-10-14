import { statusFeature } from '@features/status/status.feature';
import { keywordFeature } from '@features/keyword/keyword.feature';
import { notifyFeature } from '@features/notify/notify.feature';
import { guildFeature } from '@features/guild/guild.feature';
import { reactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { botFeature } from '@features/bot/bot.feature';
import { buildPresence } from '@features/bot/bot.presence';
import type { ActivityConfig } from '@features/bot/bot.presence';
import type { DiscordClient } from '@discord-bot/discord-client';
import { appConfig } from '@core/config';
import { BaseColors, Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';

const log = createLogger('Bootstrap');

export async function bootstrapApp(client: DiscordClient) {
  log.info('Bootstrapping application...');

  const bot = client.createBot({
    appId: appConfig.discord.appId,
    ownerIds: appConfig.discord.ownerIds,
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
    notifyFeature,
    guildFeature,
    reactionRoleFeature,
    botFeature
  );
  const syncResult = await bot.sync();
  log.info({ sync: syncResult }, 'Command sync finished');

  // Re-applies the persisted activity after each gateway Ready.
  const restoreActivity = async () => {
    try {
      const entry = await botFeature.deps.api.bot.getState('activity');
      if (!entry) return;
      await client.updatePresence(buildPresence(JSON.parse(entry.value) as ActivityConfig));
    } catch (err) {
      log.error({ err }, 'Failed to restore activity presence');
    }
  };

  log.info('Application bootstrapped successfully');

  return { bot, restoreActivity };
}
