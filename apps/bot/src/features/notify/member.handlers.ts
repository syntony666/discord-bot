import { Formatters, useHandlers } from '@discord-bot/discord-client';
import type { CommandContext } from '@discord-bot/discord-client';
import { NotificationType } from '@discord-bot/shared';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { GuildApi } from '@features/guild/guild.api';
import type { MemberNotifyApi } from './member.api';
import { createMemberNotifyService } from './member.service';
import { notifyCommand } from './notify.command';

const log = createLogger('MemberNotify');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface MemberNotifyDeps {
  discord: DiscordHelpers;
  api: { memberNotify: MemberNotifyApi; guild: GuildApi };
}

const typeName = (type: 'join' | 'leave') => (type === 'join' ? '加入通知' : '離開通知');

const typeEmoji = (enabled: boolean) => (enabled ? '✅' : '❌');

const DEFAULT_TEMPLATES = {
  join: '📥 {user} 加入了 {server}！目前共 {memberCount} 位成員',
  leave: '📤 {username} 離開了 {server}。目前剩餘 {memberCount} 位成員',
} as const;

export function useMemberNotifyHandlers(deps: MemberNotifyDeps) {
  const { discord } = deps;
  const api = deps.api.memberNotify;
  const guildApi = deps.api.guild;
  const service = createMemberNotifyService();
  const h = useHandlers(notifyCommand);

  const cancelled = {
    embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
    components: [],
  };

  h.handler('member.enable', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const channelId = ctx.options.channel.id;

    await guildApi.ensureGuild(guildId);
    await Promise.all([
      api.setNotificationChannel({
        guildId,
        type: NotificationType.MEMBER_JOIN,
        channelId,
      }),
      api.setNotificationChannel({
        guildId,
        type: NotificationType.MEMBER_LEAVE,
        channelId,
      }),
    ]);

    await ctx.reply({
      embeds: [
        {
          title: '成員通知已啟用',
          description: `通知頻道已設定為 ${Formatters.channelMention(channelId)}\n加入與離開通知已自動開啟。`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ guildId, channelId }, 'Member notify enabled');
  });

  h.handler('member.disable', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const channels = await api.getNotificationChannels(guildId);
    if (channels.length === 0) {
      return ctx.reply({
        embeds: [
          {
            title: '尚未設定',
            description: '目前沒有任何通知設定。',
            color: Colors.INFO,
          },
        ],
      });
    }

    const enabledList = channels
      .filter((ch) => ch.enabled)
      .map((ch) => `✅ ${ch.type === 'MEMBER_JOIN' ? '加入' : '離開'}通知`);

    const ok = await ctx.confirm({
      title: '⚠️ 確認關閉成員通知',
      description: '即將關閉所有成員進出通知功能。',
      fields: [
        {
          name: '目前啟用的通知',
          value: enabledList.length > 0 ? enabledList.join('\n') : '*(所有通知都已關閉)*',
        },
        {
          name: '通知頻道',
          value: channels.map((ch) => Formatters.channelMention(ch.channelId)).join(', '),
        },
      ],
      confirmLabel: '確認關閉',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    await Promise.all(channels.map((ch) => api.toggleChannelEnabled(guildId, ch.type, false)));
    await ctx.editReply({
      embeds: [
        {
          title: '成員通知已關閉',
          description: `所有成員進出通知已停用。\n使用 ${discord.commandMention('notify member enable')} 可重新啟用。`,
          color: Colors.SUCCESS,
        },
      ],
      components: [],
    });
    log.info({ guildId }, 'All member notifications disabled');
  });

  h.handler('member.status', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const [joinChannel, leaveChannel, templates] = await Promise.all([
      api.getNotificationChannel(guildId, NotificationType.MEMBER_JOIN),
      api.getNotificationChannel(guildId, NotificationType.MEMBER_LEAVE),
      api.getMessageTemplates(guildId),
    ]);

    if (!joinChannel && !leaveChannel) {
      return ctx.reply({
        embeds: [
          {
            title: '成員通知狀態',
            description: `尚未設定成員通知功能。\n使用 ${discord.commandMention('notify member enable')} 開始設定。`,
            color: Colors.INFO,
          },
        ],
      });
    }

    const description = [
      `**${typeName('join')}:** ${typeEmoji(joinChannel?.enabled || false)} ${joinChannel?.enabled ? '已啟用' : '已停用'}`,
      joinChannel ? `通知頻道: ${Formatters.channelMention(joinChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.joinMessage || '預設訊息'}\``,
      '',
      `**${typeName('leave')}:** ${typeEmoji(leaveChannel?.enabled || false)} ${leaveChannel?.enabled ? '已啟用' : '已停用'}`,
      leaveChannel
        ? `通知頻道: ${Formatters.channelMention(leaveChannel.channelId)}`
        : '*(未設定)*',
      `訊息模板: \`${templates?.leaveMessage || '預設訊息'}\``,
      '',
      '**可用變數**: `{user}`, `{username}`, `{server}`, `{memberCount}`',
    ].join('\n');

    await ctx.reply({
      embeds: [{ title: '成員通知狀態', description, color: Colors.INFO }],
    });
  });

  h.handler('member.test', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const type = ctx.options.type; // 'join' | 'leave'

    const templates = await api.getMessageTemplates(ctx.guildId);
    const guild = await discord.getGuild(ctx.guildId);
    const template =
      type === 'join'
        ? templates?.joinMessage || DEFAULT_TEMPLATES.join
        : templates?.leaveMessage || DEFAULT_TEMPLATES.leave;

    const testMessage = service.formatMessage(template, {
      user: Formatters.userMention(ctx.user.id),
      username: ctx.user.username || 'TestUser',
      server: guild.name,
      memberCount: guild.approximate_member_count || 0,
    });

    await ctx.reply({
      embeds: [
        {
          title: `${type === 'join' ? '加入' : '離開'}訊息預覽`,
          description: testMessage,
          color: Colors.INFO,
        },
      ],
    });
  });

  const editEvent = async (
    ctx: CommandContext<{ template?: string; enabled?: boolean }>,
    type: 'join' | 'leave'
  ) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { template, enabled } = ctx.options;
    const notifyType =
      type === 'join' ? NotificationType.MEMBER_JOIN : NotificationType.MEMBER_LEAVE;

    if (template === undefined && enabled === undefined) {
      const [channel, templates] = await Promise.all([
        api.getNotificationChannel(guildId, notifyType),
        api.getMessageTemplates(guildId),
      ]);
      const current = type === 'join' ? templates?.joinMessage : templates?.leaveMessage;
      return ctx.reply({
        embeds: [
          {
            title: `${typeName(type)}設定`,
            description: [
              `狀態: ${typeEmoji(!!channel?.enabled)} ${channel?.enabled ? '已啟用' : '已停用'}`,
              channel
                ? `通知頻道: ${Formatters.channelMention(channel.channelId)}`
                : '*(未設定頻道)*',
              `訊息模板: \`${current || '預設訊息'}\``,
            ].join('\n'),
            color: Colors.INFO,
          },
        ],
      });
    }

    const fields = [
      ...(template !== undefined ? [{ name: '新模板', value: `\`${template}\`` }] : []),
      ...(enabled !== undefined ? [{ name: '通知狀態', value: enabled ? '啟用' : '停用' }] : []),
    ];
    const ok = await ctx.confirm({
      title: `📝 確認更新${typeName(type)}`,
      description: '即將套用以下變更。',
      fields,
      confirmLabel: '確認更新',
      cancelLabel: '取消',
      danger: enabled === false,
    });
    if (!ok) return ctx.editReply(cancelled);

    if (template !== undefined) {
      await api.updateMessage({ guildId, type, message: template });
    }
    if (enabled !== undefined) {
      await api.toggleChannelEnabled(guildId, notifyType, enabled);
    }
    await ctx.editReply({
      embeds: [
        {
          title: '設定已更新',
          description: `${typeName(type)}已更新。`,
          color: Colors.SUCCESS,
        },
      ],
      components: [],
    });
    log.info(
      { guildId, type, hasTemplate: template !== undefined, enabled },
      'Notify event updated'
    );
  };

  h.handler('member.join', (ctx) => editEvent(ctx, 'join'));
  h.handler('member.leave', (ctx) => editEvent(ctx, 'leave'));

  h.event('guildMemberAdd', async ({ user, guild_id: guildId }) => {
    if (!user) return;
    try {
      await guildApi.ensureGuild(guildId);

      const joinChannel = await api.getNotificationChannel(guildId, NotificationType.MEMBER_JOIN);
      if (!service.shouldSendJoin(joinChannel)) return;

      const templates = await api.getMessageTemplates(guildId);
      const guild = await discord.getGuild(guildId);
      const message = service.formatMessage(templates?.joinMessage || DEFAULT_TEMPLATES.join, {
        user: Formatters.userMention(user.id),
        username: user.username || 'Unknown',
        server: guild.name,
        memberCount: guild.approximate_member_count || 0,
      });

      await discord.sendMessage(joinChannel!.channelId, {
        embeds: [
          {
            title: '新成員加入',
            description: message,
            color: Colors.MEMBER_JOIN,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      log.info({ guildId, userId: user.id }, 'Sent join notification');
    } catch (error) {
      log.error({ error, guildId, userId: user.id }, 'Failed to send join notification');
    }
  });

  h.event('guildMemberRemove', async ({ user, guild_id: guildId }) => {
    try {
      const leaveChannel = await api.getNotificationChannel(guildId, NotificationType.MEMBER_LEAVE);
      if (!service.shouldSendLeave(leaveChannel)) return;

      const templates = await api.getMessageTemplates(guildId);
      const guild = await discord.getGuild(guildId);
      const message = service.formatMessage(templates?.leaveMessage || DEFAULT_TEMPLATES.leave, {
        user: Formatters.userMention(user.id),
        username: user.username || 'Unknown',
        server: guild.name,
        memberCount: guild.approximate_member_count || 0,
      });

      await discord.sendMessage(leaveChannel!.channelId, {
        embeds: [
          {
            title: '成員離開',
            description: message,
            color: Colors.MEMBER_LEAVE,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      log.info({ guildId, userId: user.id }, 'Sent leave notification');
    } catch (error) {
      log.error({ error, guildId, userId: user.id }, 'Failed to send leave notification');
    }
  });

  return h.collect();
}
