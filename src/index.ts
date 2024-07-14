import { createBot, GatewayIntents } from "@discordeno/bot";
import { CommandManager } from "./command/command.manager";
import { EventManager } from "./event/event.manager";

const eventHandlerManager = new EventManager();

const client = createBot({
  events: eventHandlerManager.getAllEvents(),
  intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages | GatewayIntents.MessageContent,
  token: process.env.BOT_TOKEN ?? "",
});

client.transformers.desiredProperties.message.id = true;
client.transformers.desiredProperties.message.content = true;
client.transformers.desiredProperties.message.channelId = true;
client.transformers.desiredProperties.interaction.data = true;
client.transformers.desiredProperties.interaction.channelId = true;
client.transformers.desiredProperties.interaction.type = true;
client.transformers.desiredProperties.interaction.token = true;
client.transformers.desiredProperties.interaction.id = true;
client.transformers.desiredProperties.interaction.guildId = true;
client.transformers.desiredProperties.interaction.guild = true;
client.transformers.desiredProperties.user.avatar = true;
client.transformers.desiredProperties.guild.approximateMemberCount = true;
client.transformers.desiredProperties.guild.approximatePresenceCount = true;
client.transformers.desiredProperties.guild.icon = true;
client.transformers.desiredProperties.guild.name = true;
client.transformers.desiredProperties.guild.id = true;

const commandManager = new CommandManager();

// commandManager.load(client);

client.start();
