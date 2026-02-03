import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { createToggleConfirmation } from '../internal/confirmations';
import type { ToggleData } from '../member-notify.types';
import { toggleNotificationType } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

/**
 * Handle /member-notify toggle
 */
export async function handleToggle(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const subCommand = subGroup.options?.[0] as InteractionDataOption;
  const type = subCommand?.name as 'join' | 'leave';
  const enabled = subCommand.options?.find((o: any) => o.name === 'enabled')?.value as boolean;
  const userId = interaction.user?.id?.toString() || '';

  try {
    await createToggleConfirmation(
      bot,
      interaction,
      { guildId, type, enabled, userId },
      async (bot, interaction, data) => {
        try {
          await toggleNotificationType(bot, module, guildId, data.type, data.enabled);

          await replySuccess(bot, interaction, {
            title: '設定已更新',
            description: `${data.type === 'join' ? '加入' : '離開'}通知已${data.enabled ? '啟用' : '停用'}。`,
            isEdit: true,
          });

          log.info({ guildId, type, enabled }, 'Notification toggled');
        } catch (error) {
          log.error({ error, guildId, type, enabled }, 'Failed to toggle');
          await handleError(bot, interaction, error, 'memberNotifySet');
        }
      }
    );
  } catch (error) {
    log.error({ error, guildId, type, enabled }, 'Failed to toggle');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}
