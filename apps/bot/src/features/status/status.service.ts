import { NotificationType } from '@discord-bot/shared';
import type { APIEmbedField } from 'discord-api-types/v10';
import type { StatusDeps } from './status.handlers';

export async function buildFeaturesStatusFields(
  guildId: string,
  api: StatusDeps['api'],
  mention: (path: string) => string
): Promise<APIEmbedField[]> {
  const [
    joinChannel,
    leaveChannel,
    streamNotifyConfig,
    streamWatchers,
    keywordRules,
    reactionRolePanels,
  ] = await Promise.all([
    api.memberNotify.getNotificationChannel(guildId, NotificationType.MEMBER_JOIN),
    api.memberNotify.getNotificationChannel(guildId, NotificationType.MEMBER_LEAVE),
    api.streamNotify.getConfig(guildId),
    api.streamNotify.getWatchers(guildId),
    api.keyword.getRulesForList(guildId),
    api.reactionRole.getPanelsByGuild(guildId),
  ]);

  const fields: APIEmbedField[] = [];

  if (joinChannel || leaveChannel) {
    fields.push({
      name: '成員進出通知',
      value:
        `${mention('notify member status')}\n` +
        `${joinChannel ? `**✅ 加入 → <#${joinChannel.channelId}>**` : '**❌ 加入 → 未設定**'}\n` +
        `${leaveChannel ? `**✅ 離開 → <#${leaveChannel.channelId}>**` : '**❌ 離開 → 未設定**'}\n\u200b`,
      inline: false,
    });
  }

  if (streamNotifyConfig || streamWatchers.length > 0) {
    const liveCount = streamWatchers.filter((w) => w.isLive).length;
    const status = streamNotifyConfig?.enabled
      ? `**✅ 已啟用 → <#${streamNotifyConfig.channelId}>**`
      : '**❌ 未啟用**';
    fields.push({
      name: '直播通知',
      value:
        `${mention('stream-notify list')}\n` +
        `${status}\n` +
        `監控 ${streamWatchers.length} 個 · 直播中 ${liveCount} 個\n\u200b`,
      inline: false,
    });
  }

  if (keywordRules.length > 0) {
    const exact = keywordRules.filter((r) => r.matchType === 'EXACT').length;
    const contains = keywordRules.length - exact;
    fields.push({
      name: '關鍵字回覆',
      value:
        `${mention('keyword list')}\n` +
        `**${keywordRules.length} 條規則**\n` +
        `精確 ${exact} · 包含 ${contains}\n\u200b`,
      inline: false,
    });
  }

  if (reactionRolePanels.length > 0) {
    const modeCounts = reactionRolePanels.reduce<Record<string, number>>((acc, panel) => {
      acc[panel.mode] = (acc[panel.mode] || 0) + 1;
      return acc;
    }, {});
    const modes = Object.entries(modeCounts)
      .map(([mode, count]) => `${mode} ×${count}`)
      .join(' · ');
    fields.push({
      name: '反應身分組',
      value:
        `${mention('reaction-role panel list')}\n` +
        `**${reactionRolePanels.length} 個 Panel**\n` +
        modes,
      inline: false,
    });
  }

  return fields;
}
