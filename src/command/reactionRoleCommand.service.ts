import { ChatInputCommandInteraction, EmbedBuilder, EmbedField, hyperlink, roleMention } from "discord.js";
import { Model } from "sequelize";
import { embedColor } from "../config";
import { ReactionRoleModel } from "../database/ReactionRoleModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EmbedPageService } from "../service/embedPageService";
import { MessageUrlService } from "../service/messageUrlService";
import { CommandServiceBase } from "./commandServiceBase";

export enum ReactionRoleOperation {
    ADD = 'add',
    REMOVE = 'remove',
    REMOVE_MSG = 'remove-message',
    LIST = 'list'
}

export class ReactionRoleCommandService extends CommandServiceBase {
    private _reactionRoleDTO = DBConnectionService(ReactionRoleModel);

    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    public _getEmbedMessage(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(embedColor.get('reactionRole') ?? null)
            .setAuthor({ name: this._interaction.client.user?.username ?? '', iconURL: this._interaction.client.user?.avatarURL() ?? undefined })
            .setDescription('事情都我在幫你做 = =')
            .setFooter({ text: this._interaction.user.tag, iconURL: this._interaction.user.avatarURL() ?? undefined })
            .setTimestamp();
    }

    public add(role: string, emoji: string, messageUrl: string) {
        const messageUrlService = new MessageUrlService(messageUrl, this._guild.id, this._interaction.client);
        messageUrlService.getMessage()
            .then(message => message.react(emoji))
            .then(() => {
                this._reactionRoleDTO.create({
                    role_id: role,
                    guild_id: this._guild.id,
                    reaction: emoji,
                    message_url: messageUrl
                })
            })
            .then(() => this._onAddSuccess(role, emoji, messageUrl))
            .catch(err => this._onOperationFail(err));
    }

    public remove(role: string) {
        this._reactionRoleDTO.destroy({
            where: {
                role_id: role,
                guild_id: this._guild.id
            }
        })
        .then(res => new Promise<void>((resolve, reject) =>{
            if (res == 0) {
                return reject()
            }
            resolve()
        }))
        .then(
            () => this._onRemoveSuccess([role]),
            () => this._onRemoveReject()
        ).catch(err => this._onOperationFail(err));
    }

    public removeMessage(messageUrl: string) {
        const criteria = {
            message_url: messageUrl,
            guild_id: this._guild.id
        }
        this._reactionRoleDTO.findAll({
            where: criteria
        })
        .then(res => new Promise((resolve, reject) =>{
            if (res.length == 0) {
                return reject()
            }
            this._reactionRoleDTO.destroy({
                where: criteria
            })
            return resolve(res);
        }))
        .then(
            res => this._onRemoveSuccess(res as Model[]),
            () => this._onRemoveReject()
        ).catch(err => this._onOperationFail(err));
    }

    public list() {
        this._reactionRoleDTO.findAll({
            where: {
                guild_id: this._guild.id
            }
        })
        .then(res => new Promise((resolve, reject) => {
            if (res.length == 0) {
                return reject();
            }
            return resolve(res);
        }))
        .then(
            res => this._onListSuccess(res),
            () => this._onListReject()
        ).catch(err => this._onOperationFail(err));
    }

    private _onAddSuccess(role: string, emoji: string, messageUrl: string) {
        let embed = this._getEmbedMessage().setTitle('身分組已設定')
            .setFields(
                { name: '訊息連結', value: messageUrl },
                { name: '身分組', value: roleMention(role), inline: true },
                { name: '表情符號', value: emoji, inline: true }
            )
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onRemoveSuccess(role: string[] | Model[]) {
        let fieldValue: string = ''
        if (role[0] instanceof Model) {
            (role as any[]).forEach((item, index) => {
                if (index == 0) {
                    fieldValue += roleMention(item.role_id)
                } else {
                    fieldValue += `, ${roleMention(item.role_id)}`
                }
            })
        } else {
            fieldValue += roleMention(role[0] as string)
        }
        let embed = this._getEmbedMessage().setTitle('身分組設定已移除')
            .setFields(
                { name: '身分組', value: fieldValue }
            )
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onRemoveReject() {
        this._interaction.reply({ content: '此身分組尚未設定', ephemeral: true });
    }

    private _onListSuccess(res: any) {
        const resultList: EmbedField[] = res.map((item: { role_id: any; reaction: string; message_url: any; }) => {
            let value = `${roleMention(item.role_id)}\n- ${hyperlink('訊息連結', item.message_url)}　${item.reaction}`;
            return { name: '\u200B', value: value }
        });
        const embedPageService = new EmbedPageService(resultList, this._interaction);
        embedPageService.setEmbedTitle('身分組列表')
            .setEmbedColor(embedColor.get('reactionRole') ?? null)
            .setEmbedDescription('事情都我在幫你做 = =')
            .setEmbedAuthor({ name: this._interaction.user.username, iconURL: this._interaction.user?.avatarURL() ?? undefined })
            .setPageCount(true);
        embedPageService.run();
    }

    private _onListReject() {
        this._interaction.reply({ content: '目前沒有設定任何身分組', ephemeral: true })
    }

    private _onOperationFail(err: Error) {
        // TODO: add error behavior
        console.log(err)
    }
}