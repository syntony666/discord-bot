import { StreamInfo } from './stream-notify.types';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { StreamNotifyApi } from './stream-notify.api';
import { StreamPlatformService } from './platforms/platform.interface';
import type { TwitchService } from './platforms/twitch.service';
import { createLogger } from '@discord-bot/shared';
import { StreamWatcher } from '@discord-bot/shared';

const log = createLogger('StreamNotifyService');

export interface StreamNotifyService {
  checkAllStreams(api: StreamNotifyApi, services: StreamPlatformService[]): Promise<void>;
  sendNotification(
    watcher: StreamWatcher,
    streamInfo: StreamInfo,
    messageTemplate: string,
    api: StreamNotifyApi
  ): Promise<void>;
  refreshTwitchWatcherAvatars(api: StreamNotifyApi, twitchService: TwitchService): Promise<void>;
}

export function createStreamNotifyService(discord: DiscordHelpers): StreamNotifyService {
  const checkAllStreams = async (
    api: StreamNotifyApi,
    services: StreamPlatformService[]
  ): Promise<void> => {
    try {
      // Get all watchers across all guilds
      const allWatchers: StreamWatcher[] = await api.getAllWatchers();

      // Handle ID conversion for Twitch watchers that don't have platformUserId yet
      const twitchWatchersNeedingConversion = allWatchers.filter(
        (w) => w.platform === 'TWITCH' && !w.platformUserId
      );

      if (twitchWatchersNeedingConversion.length > 0) {
        const twitchService = services.find(
          (s) => s.getPlatformName() === 'twitch'
        ) as TwitchService | undefined;
        if (twitchService) {
          const usernames = twitchWatchersNeedingConversion.map((w) => w.platformId);
          const usernameToIdMap = await twitchService.convertUsernamesToUserIds(usernames);

          // Update watchers with their user IDs
          for (const watcher of twitchWatchersNeedingConversion) {
            const userId = usernameToIdMap.get(watcher.platformId.toLowerCase());
            if (userId) {
              await api.updateWatcherUserId(watcher.id, userId);
            } else {
            }
          }
        }
      }

      // Get updated list after conversions
      const updatedWatchers: StreamWatcher[] = await api.getAllWatchers();

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
              await api.updateWatcherStatus(watcher.id, true);

              const config = await api.getConfig(watcher.guildId);
              if (config && config.enabled) {
                await sendNotification(watcher, streamInfo, config.message, api);
              }
            }
          }

          for (const watcher of updatedWatchers.filter(
            (w: StreamWatcher) => w.platform.toLowerCase() === platformName
          )) {
            const watcherId = watcher.platformUserId || watcher.platformId;
            const isStillLive = liveStreams.some((s) => s.platformId === watcherId);

            if (watcher.isLive && !isStillLive) {
              await api.updateWatcherStatus(watcher.id, false);
            }

            await api.updateLastChecked(watcher.id);
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
    messageTemplate: string,
    api: StreamNotifyApi
  ): Promise<void> => {
    try {
      const message = messageTemplate.replace(/{user}/g, streamInfo.displayName);

      const config = await api.getConfig(watcher.guildId);

      if (!config) return;

      await discord.sendMessage(config.channelId, {
        content: message,
        embeds: [
          {
            title: `🔴 ${streamInfo.displayName} 正在直播！`,
            description: streamInfo.title,
            url: streamInfo.url,
            color: 0x6441a5,
            ...(watcher.avatarImageUrl
              ? { thumbnail: { url: watcher.avatarImageUrl } }
              : {}),
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
        { guildId: watcher.guildId, platform: streamInfo.platform, platformId: streamInfo.platformId },
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

      const users = [
        ...(await twitchService.getUsersByField(
          'id',
          watchers.filter((w) => w.platformUserId).map((w) => w.platformUserId!)
        )),
        ...(await twitchService.getUsersByField(
          'login',
          watchers.filter((w) => !w.platformUserId).map((w) => w.platformId)
        )),
      ];

      const byId = new Map(users.map((u) => [u.id, u]));
      const byLogin = new Map(users.map((u) => [u.login.toLowerCase(), u]));

      for (const watcher of watchers) {
        const user = watcher.platformUserId
          ? byId.get(watcher.platformUserId)
          : byLogin.get(watcher.platformId.toLowerCase());
        if (!user) continue;

        if (!watcher.platformUserId) {
          await api.updateWatcherUserId(watcher.id, user.id);
        }
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
    sendNotification,
    refreshTwitchWatcherAvatars,
  };
}
