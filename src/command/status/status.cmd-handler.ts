import { CONFIG } from "../../config";
import { AssetsHelpers } from "../../helper/assets.helper";
import { time } from "@discordjs/formatters";
import { SnowflakeHelper } from "../../helper/snowflake.helper";
import {
  Bot,
  Interaction,
  Embed,
  InteractionCallbackData,
  MessageComponentTypes,
  ButtonStyles,
  InteractionResponseTypes,
  avatarUrl,
  applicationCoverUrl,
  guildIconUrl,
  applicationIconUrl,
} from "@discordeno/bot";

export const statusCmdHandler = async (interaction: Interaction) => {
  console.log("statusCmdHandler 0010", interaction.data);
  if (!interaction.data?.options) {
    throw new Error("NO DATA");
  }

  const bot = interaction.bot;

  let embed: InteractionCallbackData["embeds"] | undefined;
  let message: InteractionCallbackData = {};

  switch (interaction.data?.options[0].name) {
    case "bot":
      const botUser = await bot.helpers.getApplicationInfo();
      const ping = await getPing(bot, interaction);

      console.log("statusCmdHandler 0020", bot.applicationId, botUser);
      // console.log("statusCmdHandler 0021", applicationIconUrl(bot.applicationId, botUser.avatar));
      embed = [
        {
          author: {
            name: "自我介紹",
          },
          title: botUser.name,
          description: CONFIG.BOT.description,
          thumbnail: {
            url: applicationIconUrl(bot.applicationId, botUser.icon) ?? "",
          },
          footer: {
            text: `ver. ${CONFIG.BOT.version}`,
            iconUrl: AssetsHelpers.logoIcon.attachmentURL,
          },
          timestamp: new Date().toISOString(),
          fields: [
            {
              name: "REST API 版本",
              value: `\`${bot.rest.version}\``,
              inline: true,
            },
            {
              name: "Ping",
              value: `\`${ping}\`ms`,
              inline: true,
            },
          ],
        },
      ];
      message = {
        embeds: embed,
        files: [AssetsHelpers.logoIcon.fileContent],
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
      console.log(guild.id, guild.name, guild.icon);
      embed = [
        {
          author: {
            name: "伺服器資訊",
          },
          title: guild.name,
          thumbnail: {
            url: guildIconUrl(guild.id, guild.icon) ?? "",
          },
          footer: {
            text: `ver. ${CONFIG.BOT.version}`,
            iconUrl: AssetsHelpers.logoIcon.attachmentURL,
          },
          timestamp: new Date().toISOString(),
          fields: [
            {
              name: "創立時間",
              value: time(new SnowflakeHelper(guild.id).timestamp),
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
        },
      ];
      message = {
        embeds: embed,
        files: [AssetsHelpers.logoIcon.fileContent],
      };
      break;
  }
  console.log("statusCmdHandler response 001");
  interaction.respond(message).then(() => {
    console.log("statusCmdHandler response");
  });
  // bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
  //   type: InteractionResponseTypes.ChannelMessageWithSource,
  //   data: message,
  // });
};

function getPing(bot: Bot, interaction: Interaction): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log("getPing 0001", interaction.channelId);
    if (!interaction.channelId) return "出現未預期錯誤";
    const currentTime = new Date();
    console.log("getPing 0010", interaction.channel);
    bot.helpers.sendMessage(interaction.channelId ?? "", { content: "Pinging..." }).then((message) => {
      resolve(`${message.timestamp - currentTime.getTime()}`);
      bot.helpers.deleteMessage(message.channelId, message.id);
    });
  });
}
