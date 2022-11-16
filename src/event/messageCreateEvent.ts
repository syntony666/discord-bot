import { Events, Message } from "discord.js";
import { ReplyModel } from "../database/replyModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "./eventListener";

export const MessageCreateEvent: EventListener = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        replyMessages(message)
    }
}

function replyMessages(message: Message) {
    const replyDTO = DBConnectionService(ReplyModel);
    if (!message.author.bot && message.guild){
        replyDTO.findOne({
            where: {
                guild_id: message.guild.id,
                request: message.content
            }
        }).then((msg: any) => {
            if (msg.response !== null) {
                message.reply(msg.response);
                console.log(`${message.content} ===> ${msg.response}`);
            }
        }).catch(err => { });
    }
}
