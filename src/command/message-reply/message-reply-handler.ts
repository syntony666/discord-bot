import { Bot } from "discordeno/*";
import { Interaction, Embed } from "discordeno/transformers";
import { InteractionCallbackData, InteractionResponseTypes } from "discordeno/types";
import { MessageReplyDataService } from "../../data-service/message-reply.data-service";
import { Op } from "sequelize";
import { CONFIG } from "../../config";

export const messageReplyCmdHandler = async (bot: Bot, interaction: Interaction) => {
  if (!interaction.data?.options || !interaction.data.options[0].options) {
    throw new Error("NO DATA");
  }
  if (!interaction.guildId) {
    throw new Error("NO GUILD ID");
  }

  let embed: Embed = {};
  let message: InteractionCallbackData = {};

  const messageReplyDataService = new MessageReplyDataService();
  const operation = interaction.data.options[0].name;
  const input = interaction.data.options[0].options.find((option) => option.name === "input")?.value?.toString();
  const output = interaction.data.options[0].options.find((option) => option.name === "output")?.value?.toString();

  if (operation === "add") {
    if (!output || !input) {
      throw new Error("NO OUTPUT OR INPUT");
    }
    const data = await messageReplyDataService.getData(interaction.guildId);
    if (data.length > CONFIG.LIMIT.MAX_MESSAGE_REPLY) {
      embed = {
        title: "新增失敗",
        description: `已超過最大回應數量：${CONFIG.LIMIT.MAX_MESSAGE_REPLY}`,
      };
      message = {
        embeds: [embed],
      };
      return;
    }
    if (data.find((item) => item.get("input") === input)) {
      embed = {
        title: "新增失敗",
        description: "已有相同的關鍵字回應，請使用 `/message-reply edit` 指令修改",
      };
      message = {
        embeds: [embed],
      };
      return;
    }
    const addResult = await messageReplyDataService.addData(interaction.guildId, interaction.user.id, input, output);
    embed = {
      title: "新增資料",
      description: `已新增資料：\n${addResult.get("input")}\n${addResult.get("output")}
      -# 目前關鍵字回應數量: ${data.length + 1}/${CONFIG.LIMIT.MAX_MESSAGE_REPLY}`,
    };
    message = {
      embeds: [embed],
    };
  }

  if (operation === "list" || operation === "search") {
    const query = input ? { [Op.substring]: input } : undefined;
    const data = await messageReplyDataService.getData(interaction.guildId, query ?? input);
    if (data.length === 0) {
      embed = {
        title: "查無資料",
        description: "找不到符合的資料",
      };
    } else {
      embed = {
        title: "資料列表",
        fields: data.map((item) => ({
          name: `${item.get("input")}`,
          value: `${item.get("output")}
          - <@${item.get("last_editor_id")}>`,
        })),
      };
    }
    message = {
      embeds: [embed],
    };
  }

  switch (interaction.data?.options[0].name) {
    case "add":
      break;
    case "edit":
      break;
    case "remove":
      break;
    case "list":
      break;
    case "search":
      break;
    default:
      break;
  }

  bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: InteractionResponseTypes.ChannelMessageWithSource,
    data: message,
  });
};
