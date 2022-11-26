import { Events, MessageReaction, User } from "discord.js";
import { EventActionHelper } from "../helper/eventActionHelper";
import { EventListener } from "./eventListener";
export const MessageCreateEvent: EventListener = {
    name: Events.MessageReactionAdd,
    execute: async (reaction: MessageReaction, user: User) => {
        if (user.bot) return;
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }
        roleAddWhenReaction(reaction, user)
    }
}

function roleAddWhenReaction(reaction: MessageReaction, user: User) {
    if (!reaction.message.guild) return;
    EventActionHelper.roleOperateWhenReaction(reaction.message.guild, user, reaction.emoji, reaction.message, "add");
}
