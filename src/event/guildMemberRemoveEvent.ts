import { Events, GuildMember } from "discord.js";
import { EventActionHelper } from "../helper/eventActionHelper";
import { EventListener } from "./eventListener";

export const GuildMemberRemoveEvent: EventListener = {
    name: Events.GuildMemberRemove,
    execute: async (member: GuildMember) => {
        guildMemberRemoveNotify(member)
    }
}

function guildMemberRemoveNotify(member: GuildMember) {
    EventActionHelper.guildMemberNotify(member.guild, member.user, 'remove')
}
