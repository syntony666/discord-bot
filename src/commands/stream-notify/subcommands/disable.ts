import { lastValueFrom } from 'rxjs';
import { createLogger } from '@core/logger';
import { replySuccess } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { StreamNotifyCommandContext } from '../stream-notify.types';

const log = createLogger('StreamNotifyDisable');

export async function handleStreamNotifyDisable(ctx: StreamNotifyCommandContext): Promise<void> {
  try {
    const { guildId, module } = ctx;

    const existingConfig = await lastValueFrom(module.getConfig$(guildId));
    
    if (!existingConfig) {
      await replySuccess(ctx.bot, ctx.interaction, {
        title: '直播通知未啟用',
        description: '此伺服器尚未啟用直播通知功能',
      });
      return;
    }

    await lastValueFrom(module.updateConfig$(guildId, { enabled: false }));
    
    await replySuccess(ctx.bot, ctx.interaction, {
      title: '直播通知已停用',
      description: '直播通知功能已暫時停用',
    });

    log.info({ guildId }, 'Stream notify disabled');
  } catch (error) {
    log.error({ error, guildId: ctx.guildId }, 'Failed to disable stream notify');
    await handleError(ctx.bot, ctx.interaction, error, 'stream-notify-disable');
  }
}
