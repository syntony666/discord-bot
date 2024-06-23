import { GatewayIntents, createBot, startBot } from "discordeno";
import { CommandManager } from "./command/command.manager";

const client = createBot({
  events: {
    ready(client: any, payload: any) {
      console.log(
        `Successfully connected Shard ${payload.shardId} to the gateway`
      );
    },
  },
  intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages,
  token: process.env.BOT_TOKEN ?? "",
});

const commandManager = new CommandManager(client);

commandManager.load();

startBot(client);
