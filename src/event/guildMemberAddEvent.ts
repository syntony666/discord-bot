import { Events, GuildMember } from "discord.js";
import { EventActionHelper } from "../helper/eventActionHelper";
import { EventListener } from "../interface/eventListener";

export const GuildMemberAddEvent: EventListener = {
    name: Events.GuildMemberAdd,
    execute: async (member: GuildMember) => {
        guildMemberAddNotify(member)
    }
}

function guildMemberAddNotify(member: GuildMember) {
    EventActionHelper.guildMemberNotify(member.guild, member.user, 'add')
}
