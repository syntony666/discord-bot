import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { lastValueFrom } from 'rxjs';
import { replyInfo, replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { createDisableConfirmation } from '../internal/confirmations';
import type { MemberNotifyDisableData } from '../member-notify.types';
import { disableMemberNotifications } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleDisable(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  const userId = interaction.user?.id?.toString() || '';

  try {
    // Get all notification channels
    const channels = await lastValueFrom(module.getNotificationChannels$(guildId));

    if (channels.length === 0) {
      await replyInfo(actions, interaction, {
        title: '尚未設定',
        description: '目前沒有任何通知設定。',
      });
      return;
    }

    await createDisableConfirmation(
      actions,
      interaction,
      { guildId, channels },
      async (actions, interaction, data) => {
        try {
          await disableMemberNotifications(actions, module, guildId, data.channels);

          await replySuccess(actions, interaction, {
            title: '成員通知已關閉',
            description: '所有成員進出通知已停用。\n使用 `/member-notify enable` 可重新啟用。',
            isEdit: true,
          });

          log.info({ guildId: data.guildId }, 'All member notifications disabled');
        } catch (error) {
          log.error({ error, guildId: data.guildId }, 'Failed to disable member notify');
          await handleError(actions, interaction, error, 'memberNotifyRemove');
        }
      }
    );

    log.info({ guildId }, 'Member notify disable confirmation requested');
  } catch (error) {
    log.error({ error, guildId }, 'Failed to prepare member notify disable confirmation');
    await handleError(actions, interaction, error, 'memberNotifyRemove');
  }
}
