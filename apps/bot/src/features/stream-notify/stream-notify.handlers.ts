import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { StreamPlatform } from '@discord-bot/shared';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import type { SchedulerService } from '@core/scheduler';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { StreamNotifyApi } from './stream-notify.api';
import { createStreamNotifyService } from './stream-notify.service';
import { TwitchService } from './platforms/twitch.service';
import { streamNotifyCommand } from './stream-notify.command';

const log = createLogger('StreamNotify');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface StreamNotifyDeps {
  discord: DiscordHelpers;
  api: { streamNotify: StreamNotifyApi };
  scheduler: SchedulerService;
}

const TWITCH_TASK_ID = 'twitch-stream-check';

export function useStreamNotifyHandlers(deps: StreamNotifyDeps) {
  const { discord, scheduler } = deps;
  const api = deps.api.streamNotify;
  const service = createStreamNotifyService(discord);
  const h = useHandlers(streamNotifyCommand);

  const twitchService = new TwitchService(
    process.env.TWITCH_CLIENT_ID || '',
    process.env.TWITCH_CLIENT_SECRET || ''
  );

  scheduler.addTask({
    id: TWITCH_TASK_ID,
    name: 'Twitch Stream Check',
    schedule: '*/1 * * * *',
    handler: async () => {
      try {
        await service.checkAllStreams(api, [twitchService]);
      } catch (error) {
        log.error({ error }, 'Twitch stream check failed');
      }
    },
    isActive: true,
  });

  const toPlatform = (platform: string) => platform.toUpperCase() as StreamPlatform;

  h.handler('enable', async (ctx) => {
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

  h.handler('disable', async (ctx) => {
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

  h.handler('watch', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const platform = ctx.options.platform;
    const id = ctx.options.id;
    const name = ctx.options.name;

    const existingWatcher = await api.getWatcher(guildId, toPlatform(platform), id);
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

    await api.addWatcher(guildId, toPlatform(platform), id, name || id);
    await ctx.reply({
      embeds: [
        {
          title: '已新增監控',
          description: `開始監控 ${platform} 頻道 ${name || id}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId, platform, platformId: id }, 'Stream watcher added');
  });

  h.handler('unwatch', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const platform = ctx.options.platform;
    const id = ctx.options.id;

    const existingWatcher = await api.getWatcher(guildId, toPlatform(platform), id);
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

    await api.removeWatcher(guildId, toPlatform(platform), id);
    await ctx.reply({
      embeds: [
        {
          title: '已移除監控',
          description: `已停止監控 ${platform} 頻道 ${existingWatcher.displayName}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId, platform, platformId: id }, 'Stream watcher removed');
  });

  h.handler('list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const [config, watchers] = await Promise.all([
      api.getConfig(guildId),
      api.getWatchers(guildId),
    ]);

    const configItems = config
      ? [
          `📢 通知頻道: ${Formatters.channelMention(config.channelId)}`,
          `🔔 狀態: ${config.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
          `📝 訊息範本: ${config.message}`,
        ]
      : [];

    const watcherItems = watchers.map(
      (w) =>
        `${w.isLive ? '🔴 直播中' : '⚫ 離線'} **${w.displayName}** (${w.platform.toLowerCase()})`
    );

    const allItems = [...configItems, '', '🎯 監控頻道:', ...watcherItems].filter(Boolean);

    await ctx.paginate({
      items: allItems,
      render: (page, pageIndex, totalPages) => ({
        title: '直播通知設定',
        description: page.join('\n'),
        color: Colors.INFO,
        footer:
          totalPages > 1 ? { text: `第 ${pageIndex + 1}/${totalPages} 頁` } : undefined,
      }),
      emptyText: '尚未設定任何直播通知',
    });
    log.info({ guildId }, 'Stream notify list displayed');
  });

  return h.collect();
}
