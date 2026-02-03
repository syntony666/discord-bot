import { Bot, InteractionDataOption } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createConfirmation } from 'shared/confirmation/confirmation.helper';
import { replySuccess, replyInfo, replyWarning } from 'shared/message/message.helper';
import { ButtonStyles, Timeouts } from '@core/config/constants';
import { channelMention } from 'shared/utils/discord.utils';
import type { MemberNotifyDisableData, MessageTemplateData, ToggleData } from '../member-notify.types';
import { getNotificationTypeName, getNotificationTypeEmoji } from '../member-notify.helpers';

/**
 * Default cancel handler for confirmations
 */
async function defaultCancelHandler(
  bot: Bot,
  interaction: BotInteraction,
  data: any
): Promise<void> {
  await replyInfo(bot, interaction, {
    title: '已取消',
    description: '操作已取消。',
    isEdit: true,
  });
}

/**
 * Create disable confirmation dialog
 */
export async function createDisableConfirmation(
  bot: Bot,
  interaction: BotInteraction,
  data: MemberNotifyDisableData,
  onConfirm: (bot: Bot, interaction: BotInteraction, data: MemberNotifyDisableData) => Promise<void>
): Promise<void> {
  const enabledNotifications = data.channels
    .filter((ch) => ch.enabled)
    .map((ch) => `✅ ${ch.type === 'MEMBER_JOIN' ? '加入' : '離開'}通知`);

  await createConfirmation<MemberNotifyDisableData>(
    bot,
    interaction,
    {
      confirmationType: 'member_notify_disable',
      userId: interaction.user?.id?.toString() || '',
      guildId: data.guildId,
      data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: '⚠️ 確認關閉成員通知',
        description: '即將關閉所有成員進出通知功能。',
        fields: [
          {
            name: '目前啟用的通知',
            value:
              enabledNotifications.length > 0
                ? enabledNotifications.join('\n')
                : '*(所有通知都已關閉)*',
          },
          {
            name: '通知頻道',
            value: data.channels.map((ch) => channelMention(ch.channelId)).join(', '),
          },
        ],
      },
      buttons: {
        confirmLabel: '確認關閉',
        confirmStyle: ButtonStyles.DANGER,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}

/**
 * Create message template confirmation dialog
 */
export async function createMessageTemplateConfirmation(
  bot: Bot,
  interaction: BotInteraction,
  data: MessageTemplateData,
  onConfirm: (bot: Bot, interaction: BotInteraction, data: MessageTemplateData) => Promise<void>
): Promise<void> {
  await createConfirmation<MessageTemplateData>(
    bot,
    interaction,
    {
      confirmationType: 'member_notify_message',
      userId: data.userId,
      guildId: data.guildId,
      data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: '📝 確認更新訊息模板',
        description: `即將更新${getNotificationTypeName(data.type)}的訊息模板。`,
        fields: [
          {
            name: '新模板',
            value: `\`${data.template}\``,
          },
        ],
      },
      buttons: {
        confirmLabel: '確認更新',
        confirmStyle: ButtonStyles.PRIMARY,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}

/**
 * Create toggle confirmation dialog
 */
export async function createToggleConfirmation(
  bot: Bot,
  interaction: BotInteraction,
  data: ToggleData,
  onConfirm: (bot: Bot, interaction: BotInteraction, data: ToggleData) => Promise<void>
): Promise<void> {
  await createConfirmation<ToggleData>(
    bot,
    interaction,
    {
      confirmationType: 'member_notify_toggle',
      userId: data.userId,
      guildId: data.guildId,
      data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: `🔄 確認${data.enabled ? '啟用' : '停用'}${getNotificationTypeName(data.type)}`,
        description: `即將${data.enabled ? '啟用' : '停用'}${getNotificationTypeName(data.type)}。`,
      },
      buttons: {
        confirmLabel: `確認${data.enabled ? '啟用' : '停用'}`,
        confirmStyle: data.enabled ? ButtonStyles.SUCCESS : ButtonStyles.DANGER,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}
