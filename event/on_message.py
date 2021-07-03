import random
import time

from discord.ext import commands

from core.extension import Extension
from dao.reply_dao import ReplyDao


class OnMessage(Extension):
    def __init__(self, bot):
        super(OnMessage, self).__init__(bot)
        self.reply_dao = ReplyDao()

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author != self.bot.user:
            await self.reply_message(message)
            self.get_random_exp(message.author, message.guild)

    async def reply_message(self, message):
        found = self.reply_dao.get_data(str(message.guild.id), message.content)
        if len(found) != 0:
            await message.channel.send(
                found[0].send.format(m=message.author.mention))

    def get_random_exp(self, user, guild):
        random.seed(time.process_time())


def setup(bot):
    bot.add_cog(OnMessage(bot))
