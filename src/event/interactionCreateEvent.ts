import { ChatInputCommandInteraction, Events } from "discord.js";
import { commandList, guildCommandList } from "../config";
import { EventListener } from "../interface/eventListener";

export const InteractionCreateEvent: EventListener = {
  name: Events.InteractionCreate,
  execute: async (interaction: ChatInputCommandInteraction) => {
    console.log(
      `Interaction created: ${interaction} by ${interaction.user.username}`
    );

    if (!interaction.isCommand()) return;

    const command = commandList
      .concat(guildCommandList)
      .filter((cmd) => interaction.commandName === cmd.data.name)[0];

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};