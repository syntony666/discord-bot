import { InteractionDataOption } from '@discordeno/bot';
import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { createMessageTemplateConfirmation } from '../internal/confirmations';
import type { MessageTemplateData } from '../member-notify.types';
import { updateMessageTemplate } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleMessage(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const subCommand = subGroup.options?.[0] as InteractionDataOption;
  const type = subCommand?.name as 'join' | 'leave';
  const template = subCommand.options?.find((o: any) => o.name === 'template')?.value as string;
  const userId = interaction.user?.id?.toString() || '';

  try {
    await createMessageTemplateConfirmation(
      actions,
      interaction,
      { guildId, type, template, userId },
      async (actions, interaction, data) => {
        try {
          await updateMessageTemplate(actions, module, guildId, data.type, data.template);

          await replySuccess(actions, interaction, {
            title: '訊息模板已更新',
            description: `${data.type === 'join' ? '加入' : '離開'}訊息已更新為：\n\`${data.template}\``,
            isEdit: true,
          });

          log.info({ guildId, type }, 'Message template updated');
        } catch (error) {
          log.error({ error, guildId, type }, 'Failed to update message');
          await handleError(actions, interaction, error, 'memberNotifySet');
        }
      }
    );
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to update message');
    await handleError(actions, interaction, error, 'memberNotifySet');
  }
}
