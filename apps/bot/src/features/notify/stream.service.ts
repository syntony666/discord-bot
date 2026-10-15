import { StreamInfo, StreamPlatformService } from './platforms/platform.interface';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { StreamNotifyApi } from './stream.api';
import type { TwitchService } from './platforms/twitch.service';
import { createLogger } from '@discord-bot/shared';
import { StreamWatcher } from '@discord-bot/shared';
import { Colors, StreamLiveColors } from '../../core/config/colors.config';

const log = createLogger('StreamNotifyService');

export interface StreamNotifyService {
  checkAllStreams(api: StreamNotifyApi, services: StreamPlatformService[]): Promise<void>;
  refreshTwitchWatcherAvatars(api: StreamNotifyApi, twitchService: TwitchService): Promise<void>;
}

export function createStreamNotifyService(discord: DiscordHelpers): StreamNotifyService {
  const backfillTwitchUserIds = async (
    watchers: StreamWatcher[],
    api: StreamNotifyApi,
    twitchService: TwitchService
  ): Promise<void> => {
    const unconverted = watchers.filter((w) => w.platform === 'TWITCH' && !w.platformUserId);
    if (unconverted.length === 0) return;

    const usernameToIdMap = await twitchService.convertUsernamesToUserIds(
      unconverted.map((w) => w.platformId)
    );

    for (const watcher of unconverted) {
      const userId = usernameToIdMap.get(watcher.platformId.toLowerCase());
      if (userId) {
        await api.updateWatcherUserId(watcher.id, userId);
        watcher.platformUserId = userId;
      }
    }
  };

  const checkAllStreams = async (
    api: StreamNotifyApi,
    services: StreamPlatformService[]
  ): Promise<void> => {
    try {
      const watchers: StreamWatcher[] = await api.getAllWatchers();

      const twitchService = services.find((s) => s.getPlatformName() === 'twitch') as
        | TwitchService
        | undefined;
      if (twitchService) {
        await backfillTwitchUserIds(watchers, api, twitchService);
      }

      const configCache = new Map<
        string,
        { channelId: string; enabled: boolean; message: string } | null
      >();

      const getConfig = async (guildId: string) => {
        if (!configCache.has(guildId)) {
          configCache.set(guildId, await api.getConfig(guildId));
        }
        return configCache.get(guildId);
      };

      const watchersByPlatform = new Map<string, string[]>();

      for (const watcher of watchers) {
        const platformServices = services.filter(
          (s) => s.getPlatformName() === watcher.platform.toLowerCase()
        );
        if (platformServices.length > 0) {
          if (!watchersByPlatform.has(watcher.platform.toLowerCase())) {
            watchersByPlatform.set(watcher.platform.toLowerCase(), []);
          }
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
            const watcher = watchers.find((w: StreamWatcher) => {
              const watcherId = w.platformUserId || w.platformId;
              return (
                w.platform.toLowerCase() === platformName && watcherId === streamInfo.platformId
              );
            });

            if (watcher && !watcher.isLive) {
              await api.updateWatcherStatus(watcher.id, true);

              const config = await getConfig(watcher.guildId);
              if (config && config.enabled) {
                await sendNotification(watcher, streamInfo, config.channelId, config.message);
              }
            }
          }

          for (const watcher of watchers.filter(
            (w: StreamWatcher) => w.platform.toLowerCase() === platformName
          )) {
            const watcherId = watcher.platformUserId || watcher.platformId;
            const isStillLive = liveStreams.some((s) => s.platformId === watcherId);

            if (watcher.isLive && !isStillLive) {
              await api.updateWatcherStatus(watcher.id, false);
            }
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
    watcher: StreamWatcher,
    streamInfo: StreamInfo,
    channelId: string,
    messageTemplate: string
  ): Promise<void> => {
    try {
      const message = messageTemplate.replace(/{user}/g, streamInfo.displayName);

      await discord.sendMessage(channelId, {
        content: message,
        embeds: [
          {
            title: `🔴 ${streamInfo.displayName} 正在直播！`,
            description: streamInfo.title,
            url: streamInfo.url,
            color: StreamLiveColors[watcher.platform] ?? Colors.INFO,
            ...(watcher.avatarImageUrl ? { thumbnail: { url: watcher.avatarImageUrl } } : {}),
            fields: streamInfo.game
              ? [
                  {
                    name: '遊戲',
                    value: streamInfo.game,
                    inline: true,
                  },
                ]
              : [],
            timestamp: new Date().toISOString(),
          },
        ],
      });

      log.info(
        {
          guildId: watcher.guildId,
          platform: streamInfo.platform,
          platformId: streamInfo.platformId,
        },
        'Stream notification sent'
      );
    } catch (error) {
      log.error({ error, watcherId: watcher.id, streamInfo }, 'Failed to send stream notification');
    }
  };

  const refreshTwitchWatcherAvatars = async (
    api: StreamNotifyApi,
    twitchService: TwitchService
  ): Promise<void> => {
    try {
      const watchers = (await api.getAllWatchers()).filter((w) => w.platform === 'TWITCH');
      if (watchers.length === 0) return;

      await backfillTwitchUserIds(watchers, api, twitchService);

      const users = await twitchService.getUsersByField(
        'id',
        watchers.filter((w) => w.platformUserId).map((w) => w.platformUserId!)
      );

      const byId = new Map(users.map((u) => [u.id, u]));

      for (const watcher of watchers) {
        if (!watcher.platformUserId) continue;
        const user = byId.get(watcher.platformUserId);
        if (!user) continue;

        if (user.profile_image_url !== watcher.avatarImageUrl) {
          await api.updateWatcherAvatar(watcher.id, user.profile_image_url);
        }
      }
    } catch (error) {
      log.error({ error }, 'Failed to refresh Twitch watcher avatars');
    }
  };

  return {
    checkAllStreams,
    refreshTwitchWatcherAvatars,
  };
}
