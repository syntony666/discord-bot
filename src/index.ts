import { Client } from "discord.js";
import process, { exit } from "process";
import { intentOptions, partialsOptions } from "./config";
import { registerCmd } from "./util/registerCmd";
import { registerEvent } from "./util/registerEvent";
import { validateEnv } from "./util/validateEnv";

(async () => {
    if (!validateEnv()) return;

    const client = new Client({ intents: intentOptions, partials: partialsOptions });

    client.destroy();

    registerCmd();

    registerEvent(client);

    await client.login(process.env.CLIENT_TOKEN);

    // ctrl+c
    process.on('SIGINT', () => {
      client.destroy();
      exit(0);
    });

    //docker stop signal
    process.on('SIGTERM', () => {
      client.destroy();
      exit(0);
    });
})();