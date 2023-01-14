import { Events, Guild } from "discord.js";
import { GuildModel } from "../database/guildModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "./eventListener";

export const GuildCreateEvent: EventListener = {
    name: Events.GuildCreate,
    execute: async (guild: Guild) => {
        const guildDTO = DBConnectionService(GuildModel)
        guildDTO.findAll({
            where: {
                guild_id: guild.id
            }
        }).then(res => {
            if (res.length == 0) {
                guildDTO.create({ guild_id: guild.id });
            }
        }).catch(err => console.log(err))
    }
}