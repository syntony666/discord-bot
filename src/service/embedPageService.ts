import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ColorResolvable, EmbedAuthorOptions, EmbedBuilder, EmbedField } from "discord.js"

export class EmbedPageService {
    private _interaction: ChatInputCommandInteraction;
    private _fieldList: EmbedField[];
    private _embedColor: ColorResolvable | null = null;
    private _embedTitle: string | null = null;
    private _embedDescription: string | null = null;
    private _embedAuthor: EmbedAuthorOptions | null = null;
    private _isPageCount: boolean = false;
    private _isTimestamp: boolean = false;

    constructor(fieldList: EmbedField[], interaction: ChatInputCommandInteraction) {
        this._fieldList = fieldList;
        this._interaction = interaction;
        return this;
    }

    public setEmbedColor(color: ColorResolvable | null) {
        this._embedColor = color;
        return this;
    }

    public setEmbedTitle(title: string | null) {
        this._embedTitle = title;
        return this;
    }

    public setDescription(description: string | null) {
        this._embedDescription = description;
        return this;
    }

    public setEmbedAuthor(author: EmbedAuthorOptions | null) {
        this._embedAuthor = author;
        return this;
    }

    public setPageCount(flag: boolean) {
        this._isPageCount = flag;
        return this;
    }

    public setTimestamp(flag: boolean) {
        this._isTimestamp = flag;
        return this;
    }

    public async run(timeout: number = 60000) {
        const maxPage = Math.ceil(this._fieldList.length / 10);
        let currentPage = 1;
        let data = {
            embeds: [this._getCurrentPage(currentPage, maxPage)],
            components: [this._getButtons(currentPage, maxPage)],
            fetchReply: true,
            ephemeral: true
        }
        const msg = this._interaction.replied ? await this._interaction.followUp(data) : await this._interaction.reply(data);
        const collector = msg.createMessageComponentCollector({
            time: timeout
        });
        collector.on('collect', res => {
            if (res.customId == 'first') {
                currentPage = 1;
            } else if (res.customId == 'previous') {
                currentPage--;
            } else if (res.customId == 'next') {
                currentPage++;
            } else if (res.customId == 'last') {
                currentPage = maxPage;
            }
            res.update({
                components: [this._getButtons(currentPage, maxPage)],
                embeds: [this._getCurrentPage(currentPage, maxPage)],
            })
        });
    }

    private _getCurrentPage(page: number, maxPage: number): EmbedBuilder {
        if (page > maxPage || page < 1) {
            throw Error('')
        }
        const embedField = this._fieldList.slice((page - 1) * 10, page * 10);
        const embed = new EmbedBuilder()
            .setColor(this._embedColor)
            .setTitle(this._embedTitle)
            .setDescription(this._embedDescription)
            .setAuthor(this._embedAuthor)
            .setFields(embedField);
        if (this._isPageCount) {
            embed.setFooter({
                    text: `page ${(page)}/${(maxPage)} · total: ${this._fieldList.length}`,
                    iconURL: this._interaction.client.user?.avatarURL() ?? undefined
                })
        }
        if (this._isTimestamp) {
            embed.setTimestamp();
        }
        return embed;
    }

    private _getButtons(currentPage: number, maxPage: number): any {
        const buttonEmojis = {
            first: '⏪',
            previous: '◀',
            next: '▶',
            last: '⏩'
        }
    
        return new ActionRowBuilder()
            .setComponents(new ButtonBuilder().setCustomId('first').setEmoji(buttonEmojis.first).setStyle(ButtonStyle.Primary).setDisabled(currentPage == 1),
            new ButtonBuilder().setCustomId('previous').setEmoji(buttonEmojis.previous).setStyle(ButtonStyle.Primary).setDisabled(currentPage == 1),
            new ButtonBuilder().setCustomId('next').setEmoji(buttonEmojis.next).setStyle(ButtonStyle.Primary).setDisabled(currentPage == maxPage),
            new ButtonBuilder().setCustomId('last').setEmoji(buttonEmojis.last).setStyle(ButtonStyle.Primary).setDisabled(currentPage == maxPage));
    }
}