import { channelMention, ChatInputCommandInteraction, EmbedBuilder, userMention } from "discord.js";
import { embedColor } from "../config";
import { GuildModel } from "../database/guildModel";
import { DBConnectionService } from "../service/DBConnectionService";

export enum NotifyOperation {
    GUILD_JOIN = 'guild-join',
    GUILD_LEAVE = 'guild-leave',
    MSG_DEL = 'message-delete',
    OFF = 'off',
    LIST = 'list'
}

// TODO: change entity name
//      join_channel_id => guild_join_cid
//      join_message => guild_join_msg
//      leave_channel_id => guild_leave_cid
//      leave_message => guild_leave_msg
//      delete_notification_channel_id => message_delete_cid

export class NotifyCommandService {
    private _guildDTO = DBConnectionService(GuildModel);
    private _interaction: ChatInputCommandInteraction;
    private _guildId: string = '';

    constructor(interaction: ChatInputCommandInteraction) {
        if (interaction.guild != null) {
            this._interaction = interaction;
            this._guildId = interaction.guild.id;
        } else {
            // TODO: add error type
            throw new Error('')
        }
    }

    private _getEmbedMessage(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(embedColor.get('notify') ?? null)
            .setAuthor({ name: this._interaction.client.user?.username ?? '', iconURL: this._interaction.client.user?.avatarURL() ?? undefined })
            .setDescription('事情都我在幫你做 = =')
            .setFooter({ text: this._interaction.user.tag, iconURL: this._interaction.user.avatarURL() ?? undefined })
            .setTimestamp();
    }

    public guildJoin(channel: string, message: string) {
        this._guildDTO.update(
            { join_channel_id: channel, join_message: message },
            { where: { guild_id: this._guildId } }
        )
            .then(() => this._onGuildJoinSuccess(channel, message))
            .catch(err => this._onOperationFail(err))
    }

    public guildLeave(channel: string, message: string) {
        this._guildDTO.update(
            { leave_channel_id: channel, leave_message: message },
            { where: { guild_id: this._guildId } }
        )
            .then(() => this._onGuildLeaveSuccess(channel, message))
            .catch(err => this._onOperationFail(err))
    }

    public messageDelete(channel: string) {
        this._guildDTO.update(
            { delete_notification_channel_id: channel },
            { where: { guild_id: this._guildId } }
        )
            .then(() => this._onMessageDeleteSuccess(channel))
            .catch(err => this._onOperationFail(err))
    }

    public off(type: NotifyOperation) {
        let updateColumn: any;
        if (type == NotifyOperation.GUILD_JOIN) {
            updateColumn = { join_channel_id: null, join_message: null };
        }
        if (type == NotifyOperation.GUILD_LEAVE) {
            updateColumn = { leave_channel_id: null, leave_message: null };
        }
        if (type == NotifyOperation.MSG_DEL) {
            updateColumn = { join_channel_id: null, join_message: null };
        }

        this._guildDTO.update(
            updateColumn,
            { where: { guild_id: this._guildId } }
        )
            .then(() => this._onOffSuccess(type))
            .catch(err => this._onOperationFail(err))
    }

    public list() {
        this._guildDTO.findOne({
            where: {
                guild_id: this._guildId
            }
        })
            .then(res => this._onListSuccess(res))
            .catch(err => this._onOperationFail(err))
    }

    private _onGuildJoinSuccess(channel: string, message: string) {
        let embed = this._getEmbedMessage().setTitle('伺服器成員加入通知已設定')
            .setFields(
                { name: '頻道', value: channelMention(channel), inline: true },
                { name: '測試訊息', value: this._getGuildJoinMessage(message), inline: true }
            );
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onGuildLeaveSuccess(channel: string, message: string) {
        let embed = this._getEmbedMessage().setTitle('伺服器成員離開通知已設定')
            .setFields(
                { name: '頻道', value: channelMention(channel), inline: true },
                { name: '測試訊息', value: this._getGuildLeaveMessage(message), inline: true }
            );
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onMessageDeleteSuccess(channel: string) {
        let embed = this._getEmbedMessage().setTitle('訊息刪除通知已設定')
            .setFields(
                { name: '頻道', value: channelMention(channel) }
            );
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onOffSuccess(type: NotifyOperation) {
        let title: string = '';
        if (type == NotifyOperation.GUILD_JOIN) {
            title = '伺服器成員加入';
        }
        if (type == NotifyOperation.GUILD_LEAVE) {
            title = '伺服器成員離開';
        }
        if (type == NotifyOperation.MSG_DEL) {
            title = '訊息刪除';
        }
        let embed = this._getEmbedMessage().setTitle(`${title}通知已關閉`)
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onListSuccess(res: any) {
        const join = {
            name: (res.join_channel_id ? '✅' : '❎') + ' 成員加入通知',
            value: res.join_channel_id ?
                `**發送頻道:**\n- ${channelMention(res.join_channel_id)}\n**測試訊息:**\n- ${this._getGuildJoinMessage(res.join_message)}` : '\u200B'
        };
        const leave = {
            name: (res.leave_channel_id ? '✅' : '❎') + ' 成員離開通知',
            value: res.leave_channel_id ?
                `**發送頻道:**\n- ${channelMention(res.leave_channel_id)}\n**測試訊息:**\n- ${this._getGuildLeaveMessage(res.leave_message)}` : '\u200B'
        };
        const delete_notification = {
            name: (res.delete_notification_channel_id ? '✅' : '❎') + ' 訊息刪除通知',
            value: res.delete_notification_channel_id ? `**發送頻道:**\n- ${channelMention(res.delete_notification_channel_id)}` : '\u200B'
        };
        let embed = this._getEmbedMessage().setTitle('通知設定')
            .setFields(
                join, leave, delete_notification
            );
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onOperationFail(err: Error) {
        //TODO: add error type
        console.log(err)
    }

    private _getGuildJoinMessage = (message: string) => message.replace('{m}', userMention(this._interaction.user.id));
    private _getGuildLeaveMessage = (message: string) => message.replace('{m}', this._interaction.user.tag);
}

