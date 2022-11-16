import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, time } from "discord.js";
import { Command } from "./command";

export const StatusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('取得相關資訊')
        .addSubcommand(subcommand => {
            return subcommand
                .setName('bot')
                .setDescription('取得機器人資訊')
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName('server')
                .setDescription('取得伺服器資訊')
        }),
    run: async (interaction) => {
        const avatar_bg = new AttachmentBuilder('./assets/avatar_bg.png');
        const logo = new AttachmentBuilder('./assets/logo.png');
        const discord_js = new AttachmentBuilder('./assets/discord_js.png');

        if (interaction.options.getSubcommand() == 'bot') {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(interaction.user.username)
                .setAuthor({ name: '自我介紹', iconURL: 'attachment://logo.png' })
                .setDescription('做這種事才不是為了你呢...!')
                .setThumbnail('attachment://avatar_bg.png')
                .addFields(
                    { name: 'Bot Ping', value: `\`${Date.now() - interaction.createdAt.getTime()} ms\``, inline: true },
                    { name: 'API Ping', value: `\`${interaction.client.ws.ping} ms\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ver. ${process.env.VERSION}`, iconURL: 'attachment://discord_js.png' });
            let buttons: any = null;
            buttons = new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setLabel('使用說明').setURL('https://discord-bot.syntony666.com/')
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('邀請連結').setURL('https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot')
                        .setStyle(ButtonStyle.Link)
                );
            interaction.reply({ embeds: [embed], files: [avatar_bg, logo, discord_js], components:[buttons], ephemeral: false });
        } else if (interaction.options.getSubcommand() == 'server') {
            interaction.guild?.fetchOwner()
                .then(owner => {
                    return owner.user.tag;
                }).then(ownerTag => {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(interaction.guild?.name ?? '')
                        .setAuthor({ name: '伺服器資訊', iconURL: 'attachment://logo.png' })
                        .setFields(
                            { name: '伺服器擁有者', value: ownerTag, inline: true },
                            { name: '創立時間', value: time(interaction.guild?.createdAt), inline: true },
                            { name: '成員數量', value: `${interaction.guild?.memberCount}`, inline: false },
                        )
                        .setThumbnail(interaction.guild?.iconURL() ?? '')
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? '' });
                    interaction.reply({ embeds: [embed], files: [logo], ephemeral: false });
                })
        } else {
            await interaction.reply({ content: `指令錯誤: ${interaction}`, ephemeral: true });
        }
    }
}