import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { MessageFlags } from 'discord-api-types/v10';
import type { APIEmbed } from 'discord-api-types/v10';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { createLogger } from '@discord-bot/shared';
import { Colors } from '@core/config/colors.config';
import { sayCommand } from './say.command';
import { avatarUrlOf, unescapeNewlines } from './say.utils';

const log = createLogger('Say');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface SayDeps {
  discord: DiscordHelpers;
}

export function useSayHandlers(deps: SayDeps) {
  const { discord } = deps;
  const h = useHandlers(sayCommand);

  h.handler('say', async (ctx) => {
    const user = ctx.user;
    const authorName = user.global_name ?? user.username;
    const timeoutMs = 120_000;
    const channelId = ctx.interaction.channel_id;
    const embed: APIEmbed = {
      // Title/footer hold the confirm prompt only while previewing — both are
      // replaced with the user-facing values before the message goes out.
      title: `⚠️ 確定要發送至 ${Formatters.channelMention(channelId)} 嗎？`,
      description: unescapeNewlines(ctx.options.message),
      color: Colors.INFO,
      footer: {
        text: `${authorName} · ${timeoutMs / 60_000} 分鐘後失效`,
        icon_url: avatarUrlOf(user),
      },
    };

    if (
      !(await ctx.confirmed({
        embeds: [embed],
        confirmLabel: '發送',
        timeoutMs,
      }))
    )
      return;

    try {
      embed.title = ctx.options.title;
      embed.footer = { text: authorName, icon_url: avatarUrlOf(user) };
      embed.timestamp = new Date().toISOString();
      const msg = await discord.sendMessage(channelId, { embeds: [embed] });
      await ctx.followUp({
        embeds: [
          {
            title: '訊息已發送',
            description: `[檢視訊息](https://discord.com/channels/${ctx.guildId}/${channelId}/${msg.id})`,
            color: Colors.SUCCESS,
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
      log.info({ guildId: ctx.guildId, channelId, messageId: msg.id }, 'Say message sent');
    } catch (error) {
      log.warn(
        { guildId: ctx.guildId, channelId, error: (error as Error).message },
        'Failed to send say message'
      );
      await ctx.followUp({
        embeds: [
          {
            title: '❌ 發送失敗',
            description: '機器人無法在此頻道發送訊息，請確認權限。',
            color: Colors.ERROR,
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  return h.collect();
}
