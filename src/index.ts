import { GatewayIntents, createBot, startBot } from "discordeno";
import { CommandManager } from "./command/command.manager";
import { EventManager } from "./event/event.manager";

const eventHandlerManager = new EventManager();

const client = createBot({
  events: eventHandlerManager.getAllEvents(),
  intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages,
  token: process.env.BOT_TOKEN ?? "",
});

const commandManager = new CommandManager();

// commandManager.load(client);

startBot(client);
