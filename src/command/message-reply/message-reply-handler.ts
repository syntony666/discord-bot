import { Bot } from "discordeno/*";
import { Interaction, Embed } from "discordeno/transformers";
import {
  InteractionCallbackData,
  InteractionResponseTypes,
} from "discordeno/types";
import { MessageReplyDataService } from "../../data-service/message-reply.data-service";

export const messageReplyCmdHandler = async (
  bot: Bot,
  interaction: Interaction
) => {
  if (!interaction.data?.options || !interaction.data.options[0].options) {
    throw new Error("NO DATA");
  }
  if (!interaction.guildId) {
    throw new Error("NO GUILD ID");
  }

  let embed: Embed = {};
  let message: InteractionCallbackData = {};

  const input = interaction.data.options[0].options
    .find((option) => option.name === "input")
    ?.value?.toString();
  const output = interaction.data.options[0].options
    .find((option) => option.name === "output")
    ?.value?.toString();

  if (!input) {
    throw new Error("NO INPUT");
  }

  switch (interaction.data?.options[0].name) {
    case "add":
      if (!output) {
        throw new Error("NO OUTPUT");
      }
      new MessageReplyDataService()
        .addData(interaction.guildId, interaction.user.id, input, output)
        .then((data) => {
          // if (data.length > 0) {
          //   message = {
          //     content: "已存在相同的輸入",
          //   };
          // } else {
          //   new MessageReplyDataService()
          //     .addData(interaction.guildId ?? 0n, input, output)
          //     .then(() => {
          //       message = {
          //         content: "已新增",
          //       };
          //     });
          // }
        });
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
