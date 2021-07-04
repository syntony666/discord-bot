import typing

from model.model import Model


class ConfigModel(Model):
    def __init__(self, guild_id, join_channel, join_message, remove_channel, remove_message):
        self.guild_id = guild_id
        self.join_channel = join_channel
        self.join_message = join_message
        self.remove_channel = remove_channel
        self.remove_message = remove_message

    @classmethod
    def model_factory(cls, data):
        guild_id = data['_id']['guild']
        join_channel = data['join_channel']
        join_message = data['join_message']
        remove_channel = data['remove_channel']
        remove_message = data['remove_message']
        return cls(guild_id, join_channel, join_message, remove_channel, remove_message)

