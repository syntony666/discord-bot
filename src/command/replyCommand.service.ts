import { ChatInputCommandInteraction, EmbedBuilder, EmbedField, userMention } from "discord.js";
import { Op } from "sequelize";
import { embedColor } from "../config";
import { ReplyModel } from "../database/replyModel";
import { DBConnectionService } from "../service/DBConnectionService";
import { EmbedPageService } from "../service/embedPageService";

export enum ReplyOperation {
    ADD = 'add',
    EDIT = 'edit',
    REMOVE = 'remove',
    SEARCH = 'search',
    LIST = 'list'
}

export class ReplyCommandService {
    private _replyDTO = DBConnectionService(ReplyModel);
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

    public _getEmbedMessage(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(embedColor.get('reply') ?? null)
            .setAuthor({ name: this._interaction.client.user?.username ?? '', iconURL: this._interaction.client.user?.avatarURL() ?? undefined })
            .setDescription('又在教我奇怪的東西了...')
            .setFooter({ text: this._interaction.user.tag, iconURL: this._interaction.user.avatarURL() ?? undefined })
            .setTimestamp();
    }

    public add(input: string, output: string) {
        this._replyDTO.create({
            guild_id: this._guildId,
            last_editor_id: this._interaction.user.id,
            request: input,
            response: output
        })
            .then(() => this._onAddSuccess(input, output))
            .catch((err) => this._onOperationFail(err));
    }

    public edit(input: string, output: string) {
        this._replyDTO.findOne({
            where: {
                request: input,
                guild_id: this._guildId
            }
        }).then(item => new Promise<void>((resolve, reject) => {
            if (!item) {
                return reject();
            }
            item.update({
                last_editor_id: this._interaction.user.id,
                response: output
            })
            return resolve();
        })).then(
            () => this._onEditSuccess(input, output),
            () => this._onEditReject()
        ).catch(err => this._onOperationFail(err));
    }

    public remove(input: string) {
        this._replyDTO.destroy({
            where: {
                guild_id: this._guildId,
                request: input
            }
        }).then(res => new Promise<void>((resolve, reject) => {
            if (!res) {
                return reject();
            }
            return resolve();
        })).then(
            () => this._onRemoveSuccess(input),
            () => this._onRemoveReject()
        ).catch(err => this._onOperationFail(err));
    }

    public list() {
        this._replyDTO.findAll({
            where: {
                guild_id: this._guildId
            }
        }).then(res => new Promise((resolve, reject) => {
            if (res.length == 0) {
                return reject();
            }
            return resolve(res);
        })).then(
            res => this._onListSuccess(res, null),
            () => this._onListReject()
        ).catch(err => this._onOperationFail(err));
    }

    public search(query: string) {
        this._replyDTO.findAll({
            where: {
                guild_id: this._guildId,
                request: { [Op.substring]: query }
            }
        }).then(res => new Promise((resolve, reject) => {
            if (res.length == 0) {
                return reject();
            }
            return resolve(res);
        })).then(
            res => this._onListSuccess(res, query),
            () => this._onListReject()
        ).catch(err => this._onOperationFail(err));
    }

    private _onAddSuccess(input: string, output: string) {
        let embed = this._getEmbedMessage().setTitle('回覆內容已新增')
            .setFields(
                { name: '關鍵字', value: input, inline: false },
                { name: '回覆內容', value: output, inline: true },
            );
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onEditSuccess(input: string, output: string) {
        let embed = this._getEmbedMessage().setTitle('回覆內容已修改')
            .setFields(
                { name: '關鍵字', value: input, inline: true },
                { name: '回覆內容', value: output, inline: true },
            )
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onEditReject() {
        this._interaction.reply({ content: '找不到該關鍵字', ephemeral: true });
    }

    private _onRemoveSuccess(input: string) {
        let embed = this._getEmbedMessage().setTitle('回覆內容已移除')
            .setFields(
                { name: '關鍵字', value: input },
            )
        this._interaction.reply({ embeds: [embed], ephemeral: false });
    }

    private _onRemoveReject() {
        this._interaction.reply({ content: '回覆內容不存在', ephemeral: true });
    }

    private _onListSuccess(res: any, query: string | null) {
        let embedPageService: EmbedPageService;
        if (query) {
            embedPageService = this._replyListResult(res, query);
        } else {
            embedPageService = this._replyListResult(res, null);
        }
        embedPageService.run();
    }

    private _onListReject() {
        this._interaction.reply({ content: '目前沒有任何回覆內容', ephemeral: true });
    }

    private _onOperationFail(err: Error) {
        // TODO: add error behavior
        if (err.name == 'SequelizeUniqueConstraintError') {
            this._interaction.reply({ content: '關鍵字已重複', ephemeral: true });
        } else {
            console.log(err);
            this._interaction.reply({ content: '回覆內容操作失敗，可能是資料庫損壞', ephemeral: true });
        }
    }

    private _replyListResult(res: any, query: string | null): EmbedPageService {
        const resultList: EmbedField[] = res.map((item: { last_editor_id: any; request: string; response: string; }) => {
            let last_editor = item.last_editor_id ? `\n- ${userMention(item.last_editor_id)}` : '\n';
            let value = item.response + last_editor + '\u200B';
            return { name: item.request, value: value }
        });
        const embedPageService = new EmbedPageService(resultList, this._interaction);
        if (query) {
            embedPageService.setEmbedTitle(`查詢結果: ${query}`);
        } else {
            embedPageService.setEmbedTitle('回覆內容列表');
        }
        embedPageService
            .setEmbedColor(embedColor.get('reply') ?? null)
            .setEmbedDescription('這些回答都不是我自願的...')
            .setEmbedAuthor({ name: this._interaction.user.username, iconURL: this._interaction.user.avatarURL() ?? undefined })
            .setPageCount(true);
        return embedPageService;
    }
}