import { StreamInfo } from './stream-notify.types';
import { StreamNotifyModule } from './stream-notify.module';
import { StreamPlatformService } from './platforms/platform.interface';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { createLogger } from '@core/logger';

const log = createLogger('StreamNotifyService');

export interface StreamNotifyService {
  checkAllStreams(module: StreamNotifyModule, services: StreamPlatformService[]): Promise<void>;
  sendNotification(
    guildId: string,
    streamInfo: StreamInfo,
    messageTemplate: string,
    module: StreamNotifyModule
  ): Promise<void>;
}

export function createStreamNotifyService(bot: any): StreamNotifyService {
  const checkAllStreams = async (
    module: StreamNotifyModule,
    services: StreamPlatformService[]
  ): Promise<void> => {
    try {
      const allWatchers = await lastValueFrom(module.getWatchers$(''));

      const watchersByPlatform = new Map<string, string[]>();

      for (const watcher of allWatchers) {
        const platformServices = services.filter(
          (s) => s.getPlatformName() === watcher.platform.toLowerCase()
        );
        if (platformServices.length > 0) {
          if (!watchersByPlatform.has(watcher.platform.toLowerCase())) {
            watchersByPlatform.set(watcher.platform.toLowerCase(), []);
          }
          watchersByPlatform.get(watcher.platform.toLowerCase())!.push(watcher.platformId);
        }
      }

      for (const [platformName, platformIds] of watchersByPlatform) {
        const service = services.find((s) => s.getPlatformName() === platformName);
        if (!service) continue;

        try {
          const liveStreams = await service.checkStreamStatus(platformIds);

          for (const streamInfo of liveStreams) {
            const watcher = allWatchers.find(
              (w) =>
                w.platform.toLowerCase() === platformName && w.platformId === streamInfo.platformId
            );

            if (watcher && !watcher.isLive) {
              await lastValueFrom(module.updateWatcherStatus$(watcher.id, true));

              const config = await lastValueFrom(module.getConfig$(watcher.guildId));
              if (config && config.enabled) {
                await sendNotification(watcher.guildId, streamInfo, config.message, module);
              }
            }
          }

          for (const watcher of allWatchers.filter(
            (w) => w.platform.toLowerCase() === platformName
          )) {
            const isStillLive = liveStreams.some((s) => s.platformId === watcher.platformId);

            if (watcher.isLive && !isStillLive) {
              await lastValueFrom(module.updateWatcherStatus$(watcher.id, false));
            }

            await lastValueFrom(module.updateLastChecked$(watcher.id));
          }
        } catch (error) {
          log.error({ error, platform: platformName }, 'Failed to check stream status');
        }
      }
    } catch (error) {
      log.error({ error }, 'Failed to check all streams');
    }
  };

  const sendNotification = async (
    guildId: string,
    streamInfo: StreamInfo,
    messageTemplate: string,
    module: StreamNotifyModule
  ): Promise<void> => {
    try {
      const message = messageTemplate
        .replace(/{user}/g, streamInfo.displayName)
        .replace(/{title}/g, streamInfo.title)
        .replace(/{url}/g, streamInfo.url)
        .replace(/{game}/g, streamInfo.game || 'N/A')
        .replace(/{viewers}/g, streamInfo.viewers?.toString() || 'N/A');

      const config = await lastValueFrom(module.getConfig$(guildId));

      if (!config) return;

      await bot.helpers.sendMessage(config.channelId, {
        content: message,
        embeds: streamInfo.thumbnailUrl
          ? [
              {
                title: `${streamInfo.displayName} 正在直播`,
                url: streamInfo.url,
                color: 0x6441a5,
                image: {
                  url: streamInfo.thumbnailUrl,
                },
                fields: streamInfo.game
                  ? [
                      {
                        name: '遊戲',
                        value: streamInfo.game,
                        inline: true,
                      },
                    ]
                  : [],
                footer: streamInfo.viewers
                  ? {
                      text: `觀眾: ${streamInfo.viewers}`,
                    }
                  : undefined,
              },
            ]
          : undefined,
      });

      log.info(
        { guildId, platform: streamInfo.platform, platformId: streamInfo.platformId },
        'Stream notification sent'
      );
    } catch (error) {
      log.error({ error, guildId, streamInfo }, 'Failed to send stream notification');
    }
  };

  return {
    checkAllStreams,
    sendNotification,
  };
}
