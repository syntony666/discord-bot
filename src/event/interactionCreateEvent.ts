import { ChatInputCommandInteraction, Events } from "discord.js";
import _ from "lodash";
import { commandList, guildCommandList } from "../config";
import { ErrorBase } from "../error/errorBase";
import { EventListener } from "../interface/eventListener";

export const InteractionCreateEvent: EventListener = {
  name: Events.InteractionCreate,
  execute: async (interaction: ChatInputCommandInteraction) => {
    console.log(
      `Interaction created: ${interaction} by ${interaction.user.username}`
    );

    if (!interaction.isCommand()) return;

    const command = _.concat(commandList, guildCommandList).filter(
      (cmd) => interaction.commandName === cmd.data.name
    )[0];

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (error instanceof ErrorBase)
        await interaction.reply({
          content: error.message,
          ephemeral: true,
        });
    }
  },
};