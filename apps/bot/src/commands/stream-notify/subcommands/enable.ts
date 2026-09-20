import { lastValueFrom, Observable } from 'rxjs';
import { createLogger } from '@core/logger';
import { replySuccess } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { StreamNotifyCommandContext, EnableCommandOptions } from '../stream-notify.types';
import { StreamNotifyConfig } from '@discord-bot/shared';

const log = createLogger('StreamNotifyEnable');

export async function handleStreamNotifyEnable(
  ctx: StreamNotifyCommandContext,
  options: EnableCommandOptions
): Promise<void> {
  try {
    const { actions, interaction, guildId, module } = ctx;
    const { channel, message } = options;

    const existingConfig = await lastValueFrom(
      module.getConfig$(guildId) as Observable<StreamNotifyConfig>
    );

    if (existingConfig) {
      await lastValueFrom(
        module.updateConfig$(guildId, {
          channelId: channel,
          message: message || existingConfig.message,
          enabled: true,
        })
      );

      await replySuccess(actions, interaction, {
        title: '直播通知已更新',
        description: `通知頻道已更新至 <#${channel}>`,
      });
    } else {
      await lastValueFrom(
        module.createConfig$(guildId, channel, message) as Observable<StreamNotifyConfig>
      );

      await replySuccess(actions, interaction, {
        title: '直播通知已啟用',
        description: `通知將發送至 <#${channel}>`,
      });
    }

    log.info({ guildId, channelId: channel }, 'Stream notify enabled');
  } catch (error) {
    log.error({ error, guildId: ctx.guildId }, 'Failed to enable stream notify');
    await handleError(ctx.actions, ctx.interaction, error, 'stream-notify-enable');
  }
}
