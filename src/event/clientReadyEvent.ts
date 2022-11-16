import { Client, Events } from "discord.js";
import { GuildModel } from "../database/guildModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "./eventListener";

export const ClientReadyEvent: EventListener = {
    name: Events.ClientReady,
    run: async (client: Client): Promise<void> => {
        const guildDTO = DBConnectionService(GuildModel);
        guildDTO.findAll({ attributes: ['guild_id'] }).then(guildsFound => {
            let guildsInDatabase = guildsFound.map((guild: any) => guild.guild_id);
            let guildsInDiscord = client.guilds.cache.map(guild => guild.id);
            let guildsToAdd = guildsInDiscord
                .filter(guild => !guildsInDatabase.includes(guild)).map(guild => { return { guild_id: guild } });
            guildDTO.bulkCreate(guildsToAdd)
            console.log('Database ready!!');
            console.log(`Ready! Logged in as ${client.user?.tag}`);
        });
    }
}