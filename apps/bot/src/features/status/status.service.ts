import { NotificationType } from '@discord-bot/shared';
import type { StatusDeps } from './status.handlers';

export async function buildNotifyStatusItems(
  guildId: string,
  api: StatusDeps['api']
): Promise<string[]> {
  const [
    joinChannel,
    leaveChannel,
    memberNotifyMessages,
    streamNotifyConfig,
    streamWatchers,
    keywordRules,
    reactionRolePanels,
  ] = await Promise.all([
    api.memberNotify.getNotificationChannel(guildId, NotificationType.MEMBER_JOIN),
    api.memberNotify.getNotificationChannel(guildId, NotificationType.MEMBER_LEAVE),
    api.memberNotify.getMessageTemplates(guildId),
    api.streamNotify.getConfig(guildId),
    api.streamNotify.getWatchers(guildId),
    api.keyword.getRulesForList(guildId),
    api.reactionRole.getPanelsByGuild(guildId),
  ]);

  const items: string[] = [];

  if (joinChannel || leaveChannel) {
    items.push('👥 **成員進出通知**');
    items.push(
      `   加入通知: ${joinChannel ? `✅ <#${joinChannel.channelId}>` : '❌ 未設定'}`
    );
    items.push(
      `   離開通知: ${leaveChannel ? `✅ <#${leaveChannel.channelId}>` : '❌ 未設定'}`
    );
    if (memberNotifyMessages) {
      items.push(`   加入訊息: 已自訂`);
      items.push(`   離開訊息: 已自訂`);
    }
    items.push('');
  }

  if (streamNotifyConfig || streamWatchers.length > 0) {
    const liveWatchers = streamWatchers.filter((w) => w.isLive).length;
    items.push('🔴 **直播通知**');
    items.push(`   狀態: ${streamNotifyConfig?.enabled ? '✅ 已啟用' : '❌ 已停用'}`);
    if (streamNotifyConfig) {
      items.push(`   頻道: <#${streamNotifyConfig.channelId}>`);
    }
    items.push(`   監控頻道: ${streamWatchers.length} 個`);
    items.push(`   正在直播: ${liveWatchers} 個`);
    if (streamWatchers.length > 0) {
      const twitchCount = streamWatchers.filter(
        (w) => w.platform === 'TWITCH'
      ).length;
      items.push(`   Twitch: ${twitchCount} 個`);
    }
    items.push('');
  }

  if (keywordRules.length > 0) {
    items.push('🔤 **關鍵字回覆**');
    items.push(`   規則數量: ${keywordRules.length} 個`);
    const exactRules = keywordRules.filter((r) => r.matchType === 'EXACT').length;
    const containsRules = keywordRules.filter(
      (r) => r.matchType === 'CONTAINS'
    ).length;
    items.push(`   精確比對: ${exactRules} 個`);
    items.push(`   包含比對: ${containsRules} 個`);
    items.push('');
  }

  if (reactionRolePanels.length > 0) {
    items.push('🎭 **反應身分組**');
    items.push(`   Panel 數量: ${reactionRolePanels.length} 個`);
    const modeCounts = reactionRolePanels.reduce(
      (acc, panel) => {
        acc[panel.mode] = (acc[panel.mode] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    Object.entries(modeCounts).forEach(([mode, count]) => {
      items.push(`   ${mode} 模式: ${count} 個`);
    });
    items.push('');
  }

  if (items.length === 0) {
    items.push('📭 **目前沒有啟用任何通知功能**');
  }

  return items;
}
