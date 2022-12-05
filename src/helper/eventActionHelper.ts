import { EmbedBuilder, Emoji, Guild, Message, MessageReaction, PartialMessage, TextChannel, User, userMention } from "discord.js";
import { embedColor } from "../config";
import { GuildModel } from "../database/guildModel";
import { ReactionRoleModel } from "../database/ReactionRoleModel";
import { DBConnectionService } from "../service/DBConnectionService";

export abstract class EventActionHelper {
    public static guildMemberNotify(guild: Guild, user: User, option: 'add' | 'remove') {
        const guildDTO = DBConnectionService(GuildModel)
        let channel_id: string, notifyMessage: string;
        guildDTO.findOne({
            where: {
                guild_id: guild.id
            }
        }).then((res: any) => {
            if (res == null || res.guild_join_cid == null && option == 'add' || res.guild_leave_cid == null && option == 'remove') return;
            if (option == 'add') {
                channel_id = res.guild_join_cid
                notifyMessage = res.guild_join_msg.replace('{m}', userMention(user.id))
            } else if (option == 'remove') {
                channel_id = res.guild_leave_cid
                notifyMessage = res.guild_leave_msg.replace('{m}', `${user.tag}`)
            }
            let embed = new EmbedBuilder()
                .setColor(embedColor.get('notify') ?? null)
                .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
                .setDescription(notifyMessage)
                .setFooter({ text: user.tag, iconURL: user.avatarURL() ?? undefined })
                .setTimestamp();
            guild.channels.fetch(channel_id)
                .then((channel) => (channel as TextChannel).send({ embeds: [embed] }));
        }).catch(err => console.log(err))
    }

    public static async roleOperateWhenReaction(guild: Guild, user: User, emoji: Emoji, message: Message | PartialMessage, option: 'add' | 'remove') {
        const reactionRoleDTO = DBConnectionService(ReactionRoleModel);
        reactionRoleDTO.findOne({
            where: {
                reaction: emoji.toString(),
                message_url: message.url
            }
        }).then((res: any) => {
            if (!res) return;
            if (option == "add"){
                guild.members.cache.get(user.id)?.roles.add(res.role_id);
            } else if (option == "remove") {
                guild.members.cache.get(user.id)?.roles.remove(res.role_id);
            }
        }).catch(err => {
            console.log(err.message);
        })
    }
}
