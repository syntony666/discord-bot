import { Client, Events } from "discord.js";
import { GuildModel } from "../database/guildModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "./eventListener";

export const ClientReadyEvent: EventListener = {
    name: Events.ClientReady,
    execute: async (client: Client) => {
        prepareDatabase(client)

        console.log(`Ready! Logged in as ${client.user?.tag}`);

        twitchNotifyInterval(client)
    }
}

function prepareDatabase(client: Client) {
    const guildDTO = DBConnectionService(GuildModel);
    guildDTO.findAll({ attributes: ['guild_id'] }).then(guildsFound => {
        const guildsInDatabase = guildsFound.map((guild: any) => guild.guild_id);
        const guildsInDiscord = client.guilds.cache.map(guild => guild.id);
        const guildsToAdd = guildsInDiscord
            .filter(guild => !guildsInDatabase.includes(guild)).map(guild => { return { guild_id: guild } });
        guildDTO.bulkCreate(guildsToAdd)
        console.log('Database ready!!');
    });
}

function twitchNotifyInterval(client: Client) {
    setInterval(() => {

    }, 3000)
}
