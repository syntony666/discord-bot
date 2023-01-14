import { Client } from "discord.js";
import process, { exit } from "process";
import { intentOptions, partialsOptions } from "./config";
import { registerCmd } from "./util/registerCmd";
import { registerEvent } from "./util/registerEvent";
import { validateEnv } from "./util/validateEnv";

(async () => {
    if(!validateEnv()) return;

    registerCmd();

    const client = new Client({ intents: intentOptions, partials: partialsOptions });

    registerEvent(client);

    await client.login(process.env.CLIENT_TOKEN);

    process.on('SIGINT', () => { client.destroy(); exit(0); })
})();