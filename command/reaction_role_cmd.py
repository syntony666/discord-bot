from datetime import datetime

from discord import Client, Color, Embed
from discord.ext import commands

from core.extension import Extension
from dao.reaction_role_dao import ReactionRoleDao
from core.exception import DataExist, DataNotExist
from model.reaction_role_model import ReactionRoleModel
from service.validate_service import validate_role, validate_message, get_channel_by_message


class ReactionRole(Extension):
    def __init__(self, bot: Client):
        super(ReactionRole, self).__init__(bot)
        self.embed_color = Color.blue()
        self.reaction_role_dao = ReactionRoleDao()

    @commands.has_permissions(manage_roles=True)
    @commands.group(aliases=['rr'])
    async def reaction_role(self, ctx):
        pass

    @reaction_role.command(aliases=['a'])
    async def set_reaction_role(self, ctx, role_id, message_id, reaction):
        try:
            guild_id = str(ctx.guild.id)
            validate_role(ctx.guild, role_id)
            await validate_message(ctx.guild, message_id)
            self.reaction_role_dao.create_data(guild_id, role_id, message_id, reaction)
            channel = await get_channel_by_message(ctx.guild, message_id)
            message = await channel.fetch_message(message_id)
            await message.add_reaction(reaction)
            response = self.reaction_role_dao.get_data(guild_id, role_id, message_id)
            await send_embed_msg(ctx, '已新增自動發派身份組', response[0], self.embed_color)
        except DataExist:
            await ctx.send(f'已設定此身份組的自動發派身份組')

    @reaction_role.command(aliases=['d'])
    async def del_reaction_role(self, ctx, role_id):
        try:
            guild_id = str(ctx.guild.id)
            response = self.reaction_role_dao.get_data(guild_id, role_id)
            self.reaction_role_dao.del_data(guild_id, role=role_id)
            await send_embed_msg(ctx, '已刪除自動發派身份組', response[0], self.embed_color)
        except DataNotExist:
            await ctx.send(f'找不到此身份組的自動發派身份組')

    @reaction_role.command(aliases=['dm'])
    async def del_reaction_role_by_message(self, ctx, message_id):
        try:
            guild_id = str(ctx.guild.id)
            responses = self.reaction_role_dao.get_data(guild_id, message=message_id)
            self.reaction_role_dao.del_data(guild_id, message=message_id)
            for response in responses:
                await send_embed_msg(ctx, '已刪除自動發派身份組', response, self.embed_color)
        except DataNotExist:
            await ctx.send(f'找不到此訊息的自動發派身份組')


async def send_embed_msg(ctx: commands.Context, title, response: ReactionRoleModel, color):
    channel = await get_channel_by_message(ctx.guild, response.message)
    embed = Embed(title=title, color=color)
    embed.set_thumbnail(url='attachment://reply_thumbnail.png')
    embed.set_author(name=ctx.author, icon_url=ctx.author.avatar_url)
    embed.set_footer(text=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    embed.add_field(name='身分組', value=f'<@&{response.role}>', inline=False)
    embed.add_field(name='訊息連結', value=f'https://discord.com/channels/{ctx.guild.id}/{channel.id}/{response.message}', inline=False)
    embed.add_field(name='表情符號', value=response.emoji, inline=False)
    await ctx.send(embed=embed)


def setup(bot):
    bot.add_cog(ReactionRole(bot))
