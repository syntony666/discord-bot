import { Bot } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { channelMention } from 'shared/utils/discord.utils';
import { getNotificationTypeName, getNotificationTypeEmoji } from '../member-notify.helpers';
import { getMemberNotificationStatus } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

/**
 * Handle /member-notify status
 */
export async function handleStatus(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  try {
    const { joinChannel, leaveChannel, templates } = await getMemberNotificationStatus(bot, module, guildId);

    if (!joinChannel && !leaveChannel) {
      await replyInfo(bot, interaction, {
        title: '成員通知狀態',
        description: '尚未設定成員通知功能。\n使用 `/member-notify setup` 開始設定。',
      });
      return;
    }

    const joinEmoji = getNotificationTypeEmoji(joinChannel?.enabled || false);
    const leaveEmoji = getNotificationTypeEmoji(leaveChannel?.enabled || false);

    const description = [
      `**${getNotificationTypeName('join')}:** ${joinEmoji} ${joinChannel?.enabled ? '已啟用' : '已停用'}`,
      joinChannel ? `通知頻道: ${channelMention(joinChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.joinMessage || '預設訊息'}\``,
      '',
      `**${getNotificationTypeName('leave')}:** ${leaveEmoji} ${leaveChannel?.enabled ? '已啟用' : '已停用'}`,
      leaveChannel ? `通知頻道: ${channelMention(leaveChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.leaveMessage || '預設訊息'}\``,
      '',
      '**可用變數**: `{user}`, `{username}`, `{server}`, `{memberCount}`',
    ].join('\n');

    await replyInfo(bot, interaction, {
      title: '成員通知狀態',
      description,
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get status');
    await handleError(bot, interaction, error, 'memberNotifyStatus');
  }
}
