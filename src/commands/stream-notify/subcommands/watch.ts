import { lastValueFrom } from 'rxjs';
import { createLogger } from '@core/logger';
import { replySuccess } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { StreamPlatform } from '@prisma-client/client';
import { StreamNotifyCommandContext, WatchCommandOptions } from '../stream-notify.types';

const log = createLogger('StreamNotifyWatch');

export async function handleStreamNotifyWatch(
  ctx: StreamNotifyCommandContext,
  options: WatchCommandOptions
): Promise<void> {
  try {
    const { guildId, module } = ctx;
    const { platform, id, name } = options;

    const existingWatcher = await lastValueFrom(
      module.getWatcher$(guildId, platform.toUpperCase() as StreamPlatform, id)
    );

    if (existingWatcher) {
      await replySuccess(ctx.bot, ctx.interaction, {
        title: '監控已存在',
        description: `已在監控此 ${platform} 頻道`,
      });
      return;
    }

    await lastValueFrom(
      module.addWatcher$(guildId, platform.toUpperCase() as StreamPlatform, id, name || id)
    );

    await replySuccess(ctx.bot, ctx.interaction, {
      title: '已新增監控',
      description: `開始監控 ${platform} 頻道 ${name || id}`,
    });

    log.info({ guildId, platform, platformId: id }, 'Stream watcher added');
  } catch (error) {
    log.error({ error, guildId: ctx.guildId }, 'Failed to add stream watcher');
    await handleError(ctx.bot, ctx.interaction, error, 'stream-notify-watch');
  }
}
