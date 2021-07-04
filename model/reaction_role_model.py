from model.model import Model


class ReactionRoleModel(Model):
    def __init__(self, guild_id: str, role_id: str, message_id: str, emoji: str):
        self.guild = guild_id
        self.role = role_id
        self.message = message_id
        self.emoji = emoji

    @classmethod
    def model_factory(cls, data):
        guild = data['_id']['guild']
        role = data['_id']['role']
        message = data['message']
        emoji = data['emoji']
        return cls(guild, role, message, emoji)
