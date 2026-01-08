import type { Bot, DiscordEmbed } from '@discordeno/bot';

type BasicEmbedOptions = {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbed['fields'];
  footer?: DiscordEmbed['footer'];
  timestamp?: boolean;
};

type BaseReplyOptions = {
  bot: Bot;
  interaction: any;
  /**
   * 4 = CHANNEL_MESSAGE_WITH_SOURCE
   * 7 = UPDATE_MESSAGE
   */
  isReply?: boolean;
  ephemeral?: boolean;
};

export type EmbedReplyOptions = BaseReplyOptions & BasicEmbedOptions;

function buildEmbed(opts: BasicEmbedOptions): DiscordEmbed {
  const { title, description, color, fields, footer, timestamp = false } = opts;

  const embed: DiscordEmbed = {
    title,
    description,
    color,
    fields,
    footer,
  };

  if (timestamp) {
    embed.timestamp = new Date().toISOString();
  }

  return embed;
}

export async function embedReplyHelper(options: EmbedReplyOptions) {
  const { bot, interaction, isReply = false, ephemeral = false, ...embedOpts } = options;

  const embed = buildEmbed(embedOpts);

  await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: isReply ? 7 : 4,
    data: {
      embeds: [embed],
      flags: ephemeral ? 64 : undefined,
    },
  });
}
