import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { createLogger, NotificationType } from '@discord-bot/shared';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import type { GuildApi } from '@features/guild/guild.api';
import type { MemberNotifyApi } from './member.api';
import { notifyCommand } from './notify.command';
import { buildDeleteLogEmbed, createMessageCache } from './message-delete.utils';

const log = createLogger('MessageDeleteNotify');
const TYPE = NotificationType.MESSAGE_DELETE;

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface MessageDeleteNotifyDeps {
  discord: DiscordHelpers;
  api: { memberNotify: MemberNotifyApi; guild: GuildApi };
}

export function useMessageDeleteHandlers(deps: MessageDeleteNotifyDeps) {
  const { discord } = deps;
  const api = deps.api.memberNotify;
  const guildApi = deps.api.guild;
  const h = useHandlers(notifyCommand);
  const cache = createMessageCache(5000);

  h.handler('message-delete.enable', async (ctx) => {
    const guildId = ctx.guildId;
    const channelId = ctx.options.channel.id;

    await guildApi.ensureGuild(guildId);
    await api.setNotificationChannel({ guildId, type: TYPE, channelId });
    await ctx.success(
      '刪除訊息記錄已啟用',
      `刪除記錄會發送至 ${Formatters.channelMention(channelId)}\n全群頻道的刪除都會記錄；可用 ${discord.commandMention('notify message-delete ignore')} 排除特定頻道。`
    );
    log.info({ guildId, channelId }, 'Message-delete log enabled');
  });

  h.handler('message-delete.disable', async (ctx) => {
    const cfg = await api.getNotificationChannel(ctx.guildId, TYPE);
    if (!cfg?.enabled) {
      return ctx.info('尚未啟用', '刪除訊息記錄目前是關閉狀態。');
    }
    await api.toggleChannelEnabled(ctx.guildId, TYPE, false);
    await ctx.success(
      '刪除訊息記錄已關閉',
      `使用 ${discord.commandMention('notify message-delete enable')} 可重新啟用。`
    );
    log.info({ guildId: ctx.guildId }, 'Message-delete log disabled');
  });

  h.handler('message-delete.status', async (ctx) => {
    const [cfg, ignores] = await Promise.all([
      api.getNotificationChannel(ctx.guildId, TYPE),
      api.getNotificationChannelIgnores(ctx.guildId, TYPE),
    ]);
    if (!cfg) {
      return ctx.info(
        '刪除訊息記錄狀態',
        `尚未設定。\n使用 ${discord.commandMention('notify message-delete enable')} 開始設定。`
      );
    }
    const description = [
      `**狀態：** ${cfg.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
      `刪除記錄發送至：${Formatters.channelMention(cfg.channelId)}`,
      `排除頻道：${
        ignores.length > 0
          ? ignores.map((i) => Formatters.channelMention(i.channelId)).join('、')
          : '無'
      }`,
    ].join('\n');
    await ctx.info('刪除訊息記錄狀態', description);
  });

  h.handler('message-delete.ignore', async (ctx) => {
    const channelId = ctx.options.channel.id;
    await api.addNotificationChannelIgnore(ctx.guildId, TYPE, channelId);
    await ctx.success('已加入排除', `${Formatters.channelMention(channelId)} 的刪除不會被記錄。`);
    log.info({ guildId: ctx.guildId, channelId }, 'Message-delete ignore added');
  });

  h.handler('message-delete.unignore', async (ctx) => {
    const channelId = ctx.options.channel.id;
    try {
      await api.removeNotificationChannelIgnore(ctx.guildId, TYPE, channelId);
      await ctx.success('已取消排除', `${Formatters.channelMention(channelId)} 的刪除會正常記錄。`);
      log.info({ guildId: ctx.guildId, channelId }, 'Message-delete ignore removed');
    } catch {
      await ctx.error(
        '不在排除清單',
        `${Formatters.channelMention(channelId)} 本來就不在排除清單內。`
      );
    }
  });

  h.event('messageCreate', (msg) => {
    if (!msg.guild_id) return;
    cache.set(msg.id, {
      authorId: msg.author.id,
      authorName: msg.author.global_name ?? msg.author.username,
      avatar: msg.author.avatar ?? null,
      isBot: msg.author.bot ?? false,
      content: msg.content,
      attachmentCount: msg.attachments?.length ?? 0,
      timestamp: msg.timestamp,
    });
  });

  h.event('messageDelete', async ({ id, channel_id, guild_id }) => {
    if (!guild_id) return;
    const cached = cache.get(id);
    cache.delete(id);
    if (!cached || cached.isBot) return;

    const cfg = await api.getNotificationChannel(guild_id, TYPE);
    if (!cfg?.enabled) return;
    const ignores = await api.getNotificationChannelIgnores(guild_id, TYPE);
    if (ignores.some((i) => i.channelId === channel_id)) return;

    try {
      await discord.sendMessage(cfg.channelId, {
        embeds: [buildDeleteLogEmbed(cached, channel_id, Colors.MESSAGE_DELETE)],
      });
    } catch (error) {
      log.warn(
        { guildId: guild_id, channelId: channel_id, error: (error as Error).message },
        'Failed to send delete log'
      );
    }
  });

  return h.collect();
}
