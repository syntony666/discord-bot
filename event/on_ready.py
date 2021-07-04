from discord import Game
from discord.ext import commands

from core.extension import Extension


class OnReady(Extension):
    def __init__(self, bot):
        super(OnReady, self).__init__(bot)

    @commands.Cog.listener()
    async def on_ready(self):
        await self.bot.change_presence(activity=Game('使用 [* about] 來知道怎麼玩弄我'))

    @commands.Cog.listener()
    async def on_command_error(self, ctx, exception):
        print(exception)


def setup(bot):
    bot.add_cog(OnReady(bot))
