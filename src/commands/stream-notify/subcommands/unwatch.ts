import { lastValueFrom, Observable } from 'rxjs';
import { createLogger } from '@core/logger';
import { replySuccess } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { StreamPlatform, StreamWatcher } from '@prisma-client/client';
import { StreamNotifyCommandContext, UnwatchCommandOptions } from '../stream-notify.types';

const log = createLogger('StreamNotifyUnwatch');

export async function handleStreamNotifyUnwatch(
  ctx: StreamNotifyCommandContext,
  options: UnwatchCommandOptions
): Promise<void> {
  try {
    const { guildId, module } = ctx;
    const { platform, id } = options;

    const existingWatcher = await lastValueFrom(
      module.getWatcher$(
        guildId,
        platform.toUpperCase() as StreamPlatform,
        id
      ) as Observable<StreamWatcher>
    );

    if (!existingWatcher) {
      await replySuccess(ctx.bot, ctx.interaction, {
        title: '監控不存在',
        description: `未找到此 ${platform} 頻道的監控`,
      });
      return;
    }

    await lastValueFrom(
      module.removeWatcher$(
        guildId,
        platform.toUpperCase() as StreamPlatform,
        id
      ) as Observable<StreamWatcher>
    );

    await replySuccess(ctx.bot, ctx.interaction, {
      title: '已移除監控',
      description: `已停止監控 ${platform} 頻道 ${existingWatcher.displayName}`,
    });

    log.info({ guildId, platform, platformId: id }, 'Stream watcher removed');
  } catch (error) {
    log.error({ error, guildId: ctx.guildId }, 'Failed to remove stream watcher');
    await handleError(ctx.bot, ctx.interaction, error, 'stream-notify-unwatch');
  }
}
