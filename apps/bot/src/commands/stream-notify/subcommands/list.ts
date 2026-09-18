import { lastValueFrom, Observable } from 'rxjs';
import { createLogger } from '@core/logger';
import { replyTextList } from 'shared/paginator/paginator.helper';
import { handleError } from 'shared/error';
import { StreamNotifyCommandContext } from '../stream-notify.types';
import { StreamNotifyConfig, StreamWatcher } from '@prisma-client/client';

const log = createLogger('StreamNotifyList');

export async function handleStreamNotifyList(ctx: StreamNotifyCommandContext): Promise<void> {
  try {
    const { guildId, module } = ctx;

    const [config, watchers] = await Promise.all([
      lastValueFrom(module.getConfig$(guildId) as Observable<StreamNotifyConfig>),
      lastValueFrom(module.getWatchers$(guildId) as Observable<StreamWatcher[]>),
    ]);

    if (!config && watchers.length === 0) {
      await replyTextList({
        bot: ctx.bot,
        interaction: ctx.interaction,
        items: [],
        title: () => '直播通知設定',
        mapItem: (item) => item,
        emptyText: '尚未設定任何直播通知',
      });
      return;
    }

    const configItems = config
      ? [
          `📢 通知頻道: <#${config.channelId}>`,
          `🔔 狀態: ${config.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
          `📝 訊息範本: ${config.message}`,
        ]
      : [];

    const watcherItems = watchers.map((watcher: any) => {
      const status = watcher.isLive ? '🔴 直播中' : '⚫ 離線';
      return `${status} **${watcher.displayName}** (${watcher.platform.toLowerCase()})`;
    });

    const allItems = [...configItems, '', '🎯 監控頻道:', ...watcherItems].filter(Boolean);

    await replyTextList({
      bot: ctx.bot,
      interaction: ctx.interaction,
      items: allItems,
      title: () => '直播通知設定',
      mapItem: (item) => item,
      emptyText: '尚未設定任何直播通知',
    });

    log.info({ guildId }, 'Stream notify list displayed');
  } catch (error) {
    log.error({ error, guildId: ctx.guildId }, 'Failed to list stream notify');
    await handleError(ctx.bot, ctx.interaction, error, 'stream-notify-list');
  }
}
