import { EventHandlers } from "discordeno/*";

export const interactionCreate: Partial<EventHandlers> = {
  interactionCreate(bot, interaction) {
    console.log(interaction.data);
  },
};

module.exports = interactionCreate;
