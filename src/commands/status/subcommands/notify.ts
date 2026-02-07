import { lastValueFrom, from } from 'rxjs';
import { createLogger } from '@core/logger';
import { replyTextList } from 'shared/paginator/paginator.helper';
import { handleError } from 'shared/error';
import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { NotificationType } from '@prisma-client/client';

// Import feature modules
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { StreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { KeywordModule } from '@features/keyword/keyword.module';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';

interface StatusCommandModules {
  memberNotify: MemberNotifyModule;
  streamNotify: StreamNotifyModule;
  keyword: KeywordModule;
  reactionRole: ReactionRoleModule;
}

const log = createLogger('StatusNotify');

export async function handleNotifyStatus(
  interaction: BotInteraction,
  bot: Bot,
  modules: StatusCommandModules
): Promise<void> {
  try {
    const guildId = interaction.guildId?.toString();
    if (!guildId) return;

    const [
      joinChannel,
      leaveChannel,
      memberNotifyMessages,
      streamNotifyConfig,
      streamWatchers,
      keywordRules,
      reactionRolePanels,
      reactionRoles,
    ] = await Promise.all([
      lastValueFrom(
        modules.memberNotify.getNotificationChannel$(guildId, NotificationType.MEMBER_JOIN),
        { defaultValue: null }
      ),
      lastValueFrom(
        modules.memberNotify.getNotificationChannel$(guildId, NotificationType.MEMBER_LEAVE),
        { defaultValue: null }
      ),
      lastValueFrom(modules.memberNotify.getMessageTemplates$(guildId), { defaultValue: null }),
      lastValueFrom(modules.streamNotify.getConfig$(guildId), { defaultValue: null }),
      lastValueFrom(modules.streamNotify.getWatchers$(guildId), { defaultValue: [] }),
      lastValueFrom(modules.keyword.getRulesForList$(guildId), { defaultValue: [] }),
      lastValueFrom(modules.reactionRole.getPanelsByGuild$(guildId), { defaultValue: [] }),
      lastValueFrom(from([]), { defaultValue: [] }), // 暫時使用空陣列，因為沒有 getRolesByGuild 方法
    ]);

    const statusItems = [];

    // 成員進出通知
    if (joinChannel || leaveChannel) {
      statusItems.push('👥 **成員進出通知**');
      statusItems.push(
        `   加入通知: ${joinChannel ? `✅ <#${joinChannel.channelId}>` : '❌ 未設定'}`
      );
      statusItems.push(
        `   離開通知: ${leaveChannel ? `✅ <#${leaveChannel.channelId}>` : '❌ 未設定'}`
      );

      if (memberNotifyMessages) {
        statusItems.push(`   加入訊息: 已自訂`);
        statusItems.push(`   離開訊息: 已自訂`);
      }
      statusItems.push('');
    }

    // 直播通知
    if (streamNotifyConfig || streamWatchers.length > 0) {
      const liveWatchers = streamWatchers.filter((w) => w.isLive).length;

      statusItems.push('🔴 **直播通知**');
      statusItems.push(`   狀態: ${streamNotifyConfig?.enabled ? '✅ 已啟用' : '❌ 已停用'}`);
      if (streamNotifyConfig) {
        statusItems.push(`   頻道: <#${streamNotifyConfig.channelId}>`);
      }
      statusItems.push(`   監控頻道: ${streamWatchers.length} 個`);
      statusItems.push(`   正在直播: ${liveWatchers} 個`);

      if (streamWatchers.length > 0) {
        const twitchCount = streamWatchers.filter((w) => w.platform === 'TWITCH').length;
        const youtubeCount = streamWatchers.filter((w) => w.platform === 'YOUTUBE').length;
        statusItems.push(`   Twitch: ${twitchCount} 個, YouTube: ${youtubeCount} 個`);
      }
      statusItems.push('');
    }

    // 關鍵字回覆
    if (keywordRules.length > 0) {
      statusItems.push('🔤 **關鍵字回覆**');
      statusItems.push(`   規則數量: ${keywordRules.length} 個`);

      const exactRules = keywordRules.filter((r) => r.matchType === 'EXACT').length;
      const containsRules = keywordRules.filter((r) => r.matchType === 'CONTAINS').length;

      statusItems.push(`   精確比對: ${exactRules} 個`);
      statusItems.push(`   包含比對: ${containsRules} 個`);
      statusItems.push('');
    }

    // 反應身分組
    if (reactionRolePanels.length > 0) {
      statusItems.push('🎭 **反應身分組**');
      statusItems.push(`   Panel 數量: ${reactionRolePanels.length} 個`);

      // 簡化統計，不計算身分組數量
      const modeCounts = reactionRolePanels.reduce(
        (acc, panel) => {
          acc[panel.mode] = (acc[panel.mode] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(modeCounts).forEach(([mode, count]) => {
        statusItems.push(`   ${mode} 模式: ${count} 個`);
      });
      statusItems.push('');
    }

    // 如果沒有任何通知設定
    if (statusItems.length === 0) {
      statusItems.push('📭 **目前沒有啟用任何通知功能**');
    }

    await replyTextList({
      bot,
      interaction,
      items: statusItems,
      title: () => '🔔 通知功能總覽',
      mapItem: (item) => item,
      emptyText: '目前沒有啟用任何通知功能',
    });

    log.info({ guildId }, 'Notify status displayed');
  } catch (error) {
    log.error({ error, guildId: interaction.guildId }, 'Failed to display notify status');
    await handleError(bot, interaction, error, 'status-notify');
  }
}
