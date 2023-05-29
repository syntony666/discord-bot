import { Events, Message } from "discord.js";
import { ReplyModel } from "../database/replyModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "../interface/eventListener";

export const MessageCreateEvent: EventListener = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        if(message.author.bot) return;
        replyMessages(message)
    }
}

function replyMessages(message: Message) {
    const replyDTO = DBConnectionService(ReplyModel);
    if (!message.guild){
        return;
    }
    replyDTO.findOne({
        where: {
            guild_id: message.guild.id,
            request: message.content
        }
    }).then((msg: any) => {
        if (msg !== null) {
            message.reply(msg.response);
            console.log(`message responsed: ${message.content}`);
        }
    }).catch(err => { console.log(err) });
}
