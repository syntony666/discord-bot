import { Interaction, Embed } from "discordeno/transformers";
import {
  ButtonStyles,
  InteractionCallbackData,
  InteractionResponseTypes,
  MessageComponentTypes,
} from "discordeno/types";
import { CONFIG } from "../../config";
import { Bot } from "discordeno/*";
import { AssetsHelpers } from "../../helper/assets.helper";
import { time } from "@discordjs/formatters";
import { SnowflakeHelper } from "../../helper/snowflake.helper";

export const statusCmdHandler = async (bot: Bot, interaction: Interaction) => {
  if (!interaction.data?.options) {
    throw new Error("NO DATA");
  }

  let embed: Embed = {};
  let message: InteractionCallbackData = {};

  switch (interaction.data?.options[0].name) {
    case "bot":
      const botUser = await bot.helpers.getUser(bot.id);
      const ping = await getPing(bot, interaction);
      embed = {
        author: {
          name: "自我介紹",
        },
        title: botUser.username,
        description: CONFIG.BOT.description,
        thumbnail: {
          url: bot.helpers.getAvatarURL(bot.id, botUser.discriminator, {
            avatar: botUser.avatar,
          }),
        },
        footer: {
          text: `ver. ${CONFIG.BOT.version}`,
          iconUrl: AssetsHelpers.logoIcon.attachmentURL,
        },
        timestamp: new Date().getTime(),
        fields: [
          {
            name: "Discordeno",
            value: `\`${bot.constants.DISCORDENO_VERSION}\``,
            inline: true,
          },
          {
            name: "Ping",
            value: `\`${ping}\`ms`,
            inline: true,
          },
        ],
      };
      message = {
        embeds: [embed],
        file: [AssetsHelpers.logoIcon.fileContent],
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.Button,
                style: ButtonStyles.Link,
                label: "使用說明",
                url: "https://discord-bot.syntony666.com/",
              },
              {
                type: MessageComponentTypes.Button,
                style: ButtonStyles.Link,
                label: "邀請連結",
                url: "https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot",
              },
            ],
          },
        ],
      };
      break;
    case "guild":
      if (!interaction.guildId) break;
      const guild = await bot.helpers.getGuild(interaction.guildId);
      embed = {
        author: {
          name: "伺服器資訊",
        },
        title: guild.name,
        thumbnail: {
          url: bot.helpers.getGuildIconURL(guild.id, guild.icon) ?? "",
        },
        footer: {
          text: `ver. ${CONFIG.BOT.version}`,
          iconUrl: AssetsHelpers.logoIcon.attachmentURL,
        },
        timestamp: new Date().getTime(),
        fields: [
          {
            name: "創立時間",
            value: time(SnowflakeHelper.getCreationTime(guild.id)),
          },
          {
            name: "成員",
            value: `\`${guild.approximateMemberCount}\`人`,
            inline: true,
          },
          {
            name: "在線",
            value: `\`${guild.approximatePresenceCount}\`人`,
            inline: true,
          },
        ],
      };
      message = {
        embeds: [embed],
        file: [AssetsHelpers.logoIcon.fileContent],
      };
      break;
  }
  bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: InteractionResponseTypes.ChannelMessageWithSource,
    data: message,
  });
};

function getPing(bot: Bot, interaction: Interaction): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!interaction.channelId) return "出現未預期錯誤";
    const currentTime = new Date();
    bot.helpers
      .sendMessage(interaction.channelId, { content: "Pinging..." })
      .then((message) => {
        resolve(`${message.timestamp - currentTime.getTime()}`);
        bot.helpers.deleteMessage(message.channelId, message.id);
      });
  });
}
