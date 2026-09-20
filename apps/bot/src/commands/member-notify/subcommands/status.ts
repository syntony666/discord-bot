import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { Formatters } from '@discord-bot/discord-client';
import { getNotificationTypeName, getNotificationTypeEmoji } from '../member-notify.helpers';
import { getMemberNotificationStatus } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleStatus(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  try {
    const { joinChannel, leaveChannel, templates } = await getMemberNotificationStatus(actions, module, guildId);

    if (!joinChannel && !leaveChannel) {
      await replyInfo(actions, interaction, {
        title: '成員通知狀態',
        description: '尚未設定成員通知功能。\n使用 `/member-notify enable` 開始設定。',
      });
      return;
    }

    const joinEmoji = getNotificationTypeEmoji(joinChannel?.enabled || false);
    const leaveEmoji = getNotificationTypeEmoji(leaveChannel?.enabled || false);

    console.log(joinChannel, leaveChannel, templates);

    const description = [
      `**${getNotificationTypeName('join')}:** ${joinEmoji} ${joinChannel?.enabled ? '已啟用' : '已停用'}`,
      joinChannel ? `通知頻道: ${Formatters.channelMention(joinChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.joinMessage || '預設訊息'}\``,
      '',
      `**${getNotificationTypeName('leave')}:** ${leaveEmoji} ${leaveChannel?.enabled ? '已啟用' : '已停用'}`,
      leaveChannel ? `通知頻道: ${Formatters.channelMention(leaveChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.leaveMessage || '預設訊息'}\``,
      '',
      '**可用變數**: `{user}`, `{username}`, `{server}`, `{memberCount}`',
    ].join('\n');

    await replyInfo(actions, interaction, {
      title: '成員通知狀態',
      description,
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get status');
    await handleError(actions, interaction, error, 'memberNotifyStatus');
  }
}
