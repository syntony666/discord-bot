import { GatewayIntents, Intents, createBot, startBot } from "discordeno";

const client = createBot({
  events: {
    ready(client: any, payload: any) {
      console.log(
        `Successfully connected Shard ${payload.shardId} to the gateway`
      );
    },
  },
  intents: GatewayIntents.Guilds + GatewayIntents.GuildMessages,
  token: process.env.BOT_TOKEN ?? "",
});

startBot(client);
