import { Bot, Interaction } from "discordeno/*";

export const statusCmdHandler = async (bot: Bot, interaction: Interaction) => {
  console.log(interaction.data);
};
