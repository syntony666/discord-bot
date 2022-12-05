import { channelMention, EmbedBuilder, Events, Message, TextChannel, time, userMention } from "discord.js";
import { embedColor } from "../config";
import { GuildModel } from "../database/guildModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EventListener } from "./eventListener";
export const MessageDeleteEvent: EventListener = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        if (message.author.bot) return;
        messageDeleteNotify(message)

    }
}

function messageDeleteNotify(message: Message) {
    const guildDTO = DBConnectionService(GuildModel)
    if (!message.guild) {
        return;
    }
    guildDTO.findOne({
        where: {
            guild_id: message.guild.id,
        }
    }).then((res: any) => {
        let embed = new EmbedBuilder()
            .setColor(embedColor.get('notify') ?? null)
            .setAuthor({ name: message.guild?.name ?? '', iconURL: message.guild?.iconURL() ?? undefined })
            .setDescription('又...又刪!!!')
            .setTimestamp();
        if (res.message_delete_cid != null && !message.author.bot) {
            embed.addFields(
                { name: '傳送者', value: `${userMention(message.author.id)} (${time(message.createdAt)})`, inline: true },
                { name: '頻道', value: channelMention(message.channel.id), inline: true },
                { name: '內容', value: `${message.content}` }
            )
            message.guild?.channels.fetch(res.message_delete_cid)
                .then((channel) => (channel as TextChannel).send({ embeds: [embed] }));
            console.log(`deleted message ===> message.content: ${message.content}`);
        }
    }).catch(err => { });
}
