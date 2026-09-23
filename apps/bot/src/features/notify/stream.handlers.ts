import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { StreamPlatform } from '@discord-bot/shared';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import type { Scheduler } from '@core/scheduler';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { StreamNotifyApi } from './stream.api';
import { createStreamNotifyService } from './stream.service';
import { TwitchService } from './platforms/twitch.service';
import { notifyCommand } from './notify.command';

const log = createLogger('StreamNotify');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface StreamNotifyDeps {
  discord: DiscordHelpers;
  api: { streamNotify: StreamNotifyApi };
  scheduler: Scheduler;
}

const TWITCH_TASK_ID = 'twitch-stream-check';
const TWITCH_AVATAR_TASK_ID = 'twitch-avatar-refresh';

export function useStreamNotifyHandlers(deps: StreamNotifyDeps) {
  const { discord, scheduler } = deps;
  const api = deps.api.streamNotify;
  const service = createStreamNotifyService(discord);
  const h = useHandlers(notifyCommand);

  const twitchService = new TwitchService(
    process.env.TWITCH_CLIENT_ID || '',
    process.env.TWITCH_CLIENT_SECRET || ''
  );

  scheduler.every(TWITCH_TASK_ID, 60_000, async () => {
    try {
      await service.checkAllStreams(api, [twitchService]);
    } catch (error) {
      log.error({ error }, 'Twitch stream check failed');
    }
  });

  scheduler.every(TWITCH_AVATAR_TASK_ID, 86_400_000, async () => {
    try {
      await service.refreshTwitchWatcherAvatars(api, twitchService);
    } catch (error) {
      log.error({ error }, 'Twitch avatar refresh failed');
    }
  });

  // Backfill avatars for pre-existing watchers on boot
  void service.refreshTwitchWatcherAvatars(api, twitchService);

  const toPlatform = (platform: string) => platform.toUpperCase() as StreamPlatform;

  h.handler('stream.enable', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const channelId = ctx.options.channel.id;
    const message = ctx.options.message;

    const existingConfig = await api.getConfig(guildId);

    if (existingConfig) {
      await api.updateConfig(guildId, {
        channelId,
        message: message || existingConfig.message,
        enabled: true,
      });
      await ctx.reply({
        embeds: [
          {
            title: '直播通知已更新',
            description: `通知頻道已更新至 ${Formatters.channelMention(channelId)}`,
            color: Colors.SUCCESS,
          },
        ],
      });
    } else {
      await api.createConfig(guildId, channelId, message);
      await ctx.reply({
        embeds: [
          {
            title: '直播通知已啟用',
            description: `通知將發送至 ${Formatters.channelMention(channelId)}`,
            color: Colors.SUCCESS,
          },
        ],
      });
    }
    log.info({ guildId, channelId }, 'Stream notify enabled');
  });

  h.handler('stream.disable', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const existingConfig = await api.getConfig(guildId);
    if (!existingConfig) {
      return ctx.reply({
        embeds: [
          {
            title: '直播通知未啟用',
            description: '此伺服器尚未啟用直播通知功能',
            color: Colors.SUCCESS,
          },
        ],
      });
    }

    await api.updateConfig(guildId, { enabled: false });
    await ctx.reply({
      embeds: [
        {
          title: '直播通知已停用',
          description: '直播通知功能已暫時停用',
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId }, 'Stream notify disabled');
  });

  h.handler('stream.watch', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const platform = ctx.options.platform;
    const id = ctx.options.id;
    const name = ctx.options.name;

    let platformId = id;
    let displayName = name || id;
    let profile: { platformUserId?: string; avatarImageUrl?: string } | undefined;

    if (platform === 'twitch') {
      const [user] = await twitchService.getUsersByField('login', [id]);
      if (!user) {
        return ctx.reply({
          embeds: [
            {
              title: '找不到使用者',
              description: `Twitch 上找不到使用者 ${id}`,
              color: Colors.ERROR,
            },
          ],
        });
      }
      platformId = user.login;
      displayName = name || user.display_name || user.login;
      profile = { platformUserId: user.id, avatarImageUrl: user.profile_image_url };
    }

    const existingWatcher = await api.getWatcher(guildId, toPlatform(platform), platformId);
    if (existingWatcher) {
      return ctx.reply({
        embeds: [
          {
            title: '監控已存在',
            description: `已在監控此 ${platform} 頻道`,
            color: Colors.SUCCESS,
          },
        ],
      });
    }

    await api.addWatcher(guildId, toPlatform(platform), platformId, displayName, profile);
    await ctx.reply({
      embeds: [
        {
          title: '已新增監控',
          description: `開始監控 ${platform} 頻道 ${displayName}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId, platform, platformId }, 'Stream watcher added');
  });

  h.handler('stream.unwatch', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const platform = ctx.options.platform;
    const id = ctx.options.id;

    let platformId = id;
    if (platform === 'twitch') {
      const [user] = await twitchService.getUsersByField('login', [id]);
      platformId = user?.login ?? id;
    }

    const existingWatcher = await api.getWatcher(guildId, toPlatform(platform), platformId);
    if (!existingWatcher) {
      return ctx.reply({
        embeds: [
          {
            title: '監控不存在',
            description: `未找到此 ${platform} 頻道的監控`,
            color: Colors.SUCCESS,
          },
        ],
      });
    }

    await api.removeWatcher(guildId, toPlatform(platform), platformId);
    await ctx.reply({
      embeds: [
        {
          title: '已移除監控',
          description: `已停止監控 ${platform} 頻道 ${existingWatcher.displayName}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId, platform, platformId }, 'Stream watcher removed');
  });

  h.handler('stream.list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const [config, watchers] = await Promise.all([
      api.getConfig(guildId),
      api.getWatchers(guildId),
    ]);

    if (!config && watchers.length === 0) {
      await ctx.reply({
        embeds: [
          {
            title: '直播通知設定',
            description: '尚未設定任何直播通知',
            color: Colors.INFO,
          },
        ],
      });
      return;
    }

    const watcherItems =
      watchers.length > 0
        ? watchers.map((w) => {
            const name =
              w.displayName.toLowerCase() === w.platformId
                ? `**${w.platformId}**`
                : `**${w.platformId}** (${w.displayName})`;
            return `${w.isLive ? '🔴' : '⚫'}　${name} · ${w.platform.toLowerCase()}`;
          })
        : ['（尚未監控任何頻道）'];

    await ctx.paginate({
      items: watcherItems,
      render: (page) => ({
        title: '直播通知設定',
        color: Colors.INFO,
        fields: [
          ...(config
            ? [
                {
                  name: '設定',
                  value:
                    `頻道 → ${Formatters.channelMention(config.channelId)}\n` +
                    `狀態 → ${config.enabled ? '✅ 已啟用' : '❌ 已停用'}\n` +
                    `範本 → ${config.message}`,
                  inline: false,
                },
              ]
            : []),
          {
            name: `監控頻道 (${watchers.length})`,
            value: page.join('\n'),
            inline: false,
          },
        ],
      }),
    });
    log.info({ guildId }, 'Stream notify list displayed');
  });

  return h.collect();
}
