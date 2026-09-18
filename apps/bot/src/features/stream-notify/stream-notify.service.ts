import { StreamInfo } from './stream-notify.types';
import { StreamNotifyModule } from './stream-notify.module';
import { StreamPlatformService } from './platforms/platform.interface';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { createLogger } from '@core/logger';
import { StreamWatcher } from '@prisma-client/client';

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
      // Get all watchers across all guilds
      const allWatchers: StreamWatcher[] = await lastValueFrom(module.getAllWatchers$());

      // Handle ID conversion for Twitch watchers that don't have platformUserId yet
      const twitchWatchersNeedingConversion = allWatchers.filter(
        (w) => w.platform === 'TWITCH' && !w.platformUserId
      );

      if (twitchWatchersNeedingConversion.length > 0) {
        const twitchService = services.find((s) => s.getPlatformName() === 'twitch') as any;
        if (twitchService && twitchService.convertUsernamesToUserIds) {
          const usernames = twitchWatchersNeedingConversion.map((w) => w.platformId);
          const usernameToIdMap = await twitchService.convertUsernamesToUserIds(usernames);

          // Update watchers with their user IDs
          for (const watcher of twitchWatchersNeedingConversion) {
            const userId = usernameToIdMap.get(watcher.platformId.toLowerCase());
            if (userId) {
              await lastValueFrom(module.updateWatcherUserId$(watcher.id, userId));
            } else {
            }
          }
        }
      }

      // Get updated list after conversions
      const updatedWatchers: StreamWatcher[] = await lastValueFrom(module.getAllWatchers$());

      const watchersByPlatform = new Map<string, string[]>();

      for (const watcher of updatedWatchers) {
        const platformServices = services.filter(
          (s) => s.getPlatformName() === watcher.platform.toLowerCase()
        );
        if (platformServices.length > 0) {
          if (!watchersByPlatform.has(watcher.platform.toLowerCase())) {
            watchersByPlatform.set(watcher.platform.toLowerCase(), []);
          }
          // Use platformUserId if available (for Twitch), otherwise use platformId
          const idToCheck = watcher.platformUserId || watcher.platformId;
          watchersByPlatform.get(watcher.platform.toLowerCase())!.push(idToCheck);
        }
      }

      for (const [platformName, platformIds] of watchersByPlatform) {
        const service = services.find((s) => s.getPlatformName() === platformName);
        if (!service) continue;

        try {
          const liveStreams = await service.checkStreamStatus(platformIds);

          for (const streamInfo of liveStreams) {
            const watcher = updatedWatchers.find((w: StreamWatcher) => {
              const watcherId = w.platformUserId || w.platformId;
              return (
                w.platform.toLowerCase() === platformName && watcherId === streamInfo.platformId
              );
            });

            if (watcher && !watcher.isLive) {
              await lastValueFrom(module.updateWatcherStatus$(watcher.id, true));

              const config = await lastValueFrom(module.getConfig$(watcher.guildId));
              if (config && config.enabled) {
                await sendNotification(watcher.guildId, streamInfo, config.message, module);
              }
            }
          }

          for (const watcher of updatedWatchers.filter(
            (w: StreamWatcher) => w.platform.toLowerCase() === platformName
          )) {
            const watcherId = watcher.platformUserId || watcher.platformId;
            const isStillLive = liveStreams.some((s) => s.platformId === watcherId);

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
      const message = messageTemplate.replace(/{user}/g, streamInfo.displayName);

      const config = await lastValueFrom(module.getConfig$(guildId));

      if (!config) return;

      await bot.helpers.sendMessage(config.channelId, {
        content: message,
        embeds: streamInfo.thumbnailUrl
          ? [
              {
                title: `🔴 ${streamInfo.displayName} 正在直播！`,
                description: streamInfo.title,
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
                footer: {
                  timestamp: new Date().toISOString(),
                },
              },
            ]
          : [
              {
                title: `🔴 ${streamInfo.displayName} 正在直播！`,
                description: streamInfo.title,
                url: streamInfo.url,
                color: 0x6441a5,
                fields: streamInfo.game
                  ? [
                      {
                        name: '遊戲',
                        value: streamInfo.game,
                        inline: true,
                      },
                    ]
                  : [],
                footer: {
                  timestamp: new Date().toISOString(),
                },
              },
            ],
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
