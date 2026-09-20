import type { CommandOption } from '@core/discord/discord.types';
import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { createConfirmation } from 'shared/confirmation/confirmation.helper';
import { replySuccess, replyInfo, replyWarning } from 'shared/message/message.helper';
import { ButtonStyle } from 'discord-api-types/v10';
import { Timeouts } from '@core/config/constants';
import { Formatters } from '@discord-bot/discord-client';
import type { MemberNotifyDisableData, MessageTemplateData, ToggleData } from '../member-notify.types';
import { getNotificationTypeName, getNotificationTypeEmoji } from '../member-notify.helpers';

async function defaultCancelHandler(
  actions: DiscordActions,
  interaction: BotInteraction,
  data: any
): Promise<void> {
  await replyInfo(actions, interaction, {
    title: '已取消',
    description: '操作已取消。',
    isEdit: true,
  });
}

export async function createDisableConfirmation(
  actions: DiscordActions,
  interaction: BotInteraction,
  data: MemberNotifyDisableData,
  onConfirm: (actions: DiscordActions, interaction: BotInteraction, data: MemberNotifyDisableData) => Promise<void>
): Promise<void> {
  const enabledNotifications = data.channels
    .filter((ch) => ch.enabled)
    .map((ch) => `✅ ${ch.type === 'MEMBER_JOIN' ? '加入' : '離開'}通知`);

  await createConfirmation<MemberNotifyDisableData>(
    actions,
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
            value: data.channels.map((ch) => Formatters.channelMention(ch.channelId)).join(', '),
          },
        ],
      },
      buttons: {
        confirmLabel: '確認關閉',
        confirmStyle: ButtonStyle.Danger,
        cancelLabel: '取消',
        cancelStyle: ButtonStyle.Secondary,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}

export async function createMessageTemplateConfirmation(
  actions: DiscordActions,
  interaction: BotInteraction,
  data: MessageTemplateData,
  onConfirm: (actions: DiscordActions, interaction: BotInteraction, data: MessageTemplateData) => Promise<void>
): Promise<void> {
  await createConfirmation<MessageTemplateData>(
    actions,
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
        confirmStyle: ButtonStyle.Primary,
        cancelLabel: '取消',
        cancelStyle: ButtonStyle.Secondary,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}

export async function createToggleConfirmation(
  actions: DiscordActions,
  interaction: BotInteraction,
  data: ToggleData,
  onConfirm: (actions: DiscordActions, interaction: BotInteraction, data: ToggleData) => Promise<void>
): Promise<void> {
  await createConfirmation<ToggleData>(
    actions,
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
        confirmStyle: data.enabled ? ButtonStyle.Success : ButtonStyle.Danger,
        cancelLabel: '取消',
        cancelStyle: ButtonStyle.Secondary,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}
