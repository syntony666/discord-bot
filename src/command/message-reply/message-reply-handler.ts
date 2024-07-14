import { MessageReplyDataService } from "../../data-service/message-reply.data-service";
import { Op } from "sequelize";
import { CONFIG } from "../../config";
import {
  Bot,
  Interaction,
  InteractionCallbackData,
  MessageFlags,
  MessageComponentTypes,
  ButtonStyles,
  InteractionResponseTypes,
} from "@discordeno/bot";

export const messageReplyCmdHandler = async (interaction: Interaction) => {
  if (!interaction.data?.options || !interaction.data.options[0].options) {
    throw new Error("NO DATA");
  }
  if (!interaction.guildId) {
    throw new Error("NO GUILD ID");
  }

  let embed: InteractionCallbackData["embeds"] | undefined;
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
      embed = [
        {
          title: "新增失敗",
          description: `已超過最大回應數量：${CONFIG.LIMIT.MAX_MESSAGE_REPLY}`,
        },
      ];
      message = {
        embeds: embed,
        flags: MessageFlags.Ephemeral,
      };
      return;
    }
    if (data.find((item) => item.get("input") === input)) {
      embed = [
        {
          title: "新增失敗",
          description: "已有相同的關鍵字回應，請使用 `/message-reply edit` 指令修改",
        },
      ];
      message = {
        embeds: embed,
      };
      return;
    }
    // const addResult = await messageReplyDataService.addData(interaction.guildId, interaction.user.id, input, output);
    // embed = {
    //   title: "新增資料",
    //   description: `已新增資料：\n${addResult.get("input")}\n${addResult.get("output")}
    //   -# 目前關鍵字回應數量: ${data.length + 1}/${CONFIG.LIMIT.MAX_MESSAGE_REPLY}`,
    // };
    embed = [
      {
        title: "新增資料",
        description: `已新增資料：\n${input}\n${output}
      -# 目前關鍵字回應數量: ${data.length + 1}/${CONFIG.LIMIT.MAX_MESSAGE_REPLY}`,
      },
    ];
    message = {
      embeds: embed,
      components: [
        {
          type: MessageComponentTypes.ActionRow,
          components: [
            {
              type: MessageComponentTypes.Button,
              style: ButtonStyles.Primary,
              label: "確定",
              customId: "confirm-add-message-reply",
            },
          ],
        },
      ],
    };
  }

  if (operation === "edit") {
    if (!output || !input) {
      throw new Error("NO OUTPUT OR INPUT");
    }
    const data = await messageReplyDataService.getData(interaction.guildId, input);
    if (data.length === 0) {
      embed = [
        {
          title: "修改失敗",
          description: "找不到符合的資料",
        },
      ];
      message = {
        embeds: embed,
      };
      return;
    }

    const oldOutput = data[0].get("output");
    messageReplyDataService.editData(interaction.guildId, input, output);
    embed = [
      {
        title: "修改資料",
        description: `已修改資料：\n${input}\n${output}\n- 原始回應：${oldOutput}`,
      },
    ];
    message = {
      embeds: embed,
    };
  }

  if (operation === "remove") {
    if (!input) {
      throw new Error("NO INPUT");
    }
    const data = await messageReplyDataService.getData(interaction.guildId, input);
    if (data.length === 0) {
      embed = [
        {
          title: "刪除失敗",
          description: "找不到符合的資料",
        },
      ];
      message = {
        embeds: embed,
      };
      return;
    }
    messageReplyDataService.removeData(interaction.guildId, input);
    embed = [
      {
        title: "刪除資料",
        description: `已刪除資料：\n${input}\n${data[0].get("output")}`,
      },
    ];
    message = {
      embeds: embed,
    };
  }

  if (operation === "list" || operation === "search") {
    const query = input ? { [Op.substring]: input } : undefined;
    const data = await messageReplyDataService.getData(interaction.guildId, query ?? input);
    if (data.length === 0) {
      embed = [
        {
          title: "查無資料",
          description: "找不到符合的資料",
        },
      ];
    } else {
      embed = [
        {
          title: "資料列表",
          fields: data.map((item) => ({
            name: `${item.get("input")}`,
            value: `${item.get("output")}
          - <@${item.get("last_editor_id")}>`,
          })),
        },
      ];
    }
    message = {
      embeds: embed,
    };
  }

  interaction.bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: InteractionResponseTypes.ChannelMessageWithSource,
    data: message,
  });
};
