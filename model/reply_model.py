from model.model import Model


class ReplyModel(Model):
    def __init__(self, guild_id: str, receive: str, send: str):
        self.guild = guild_id
        self.receive = receive
        self.send = send

    @classmethod
    def model_factory(cls, data):
        guild = data['_id']['guild']
        receive = data['_id']['receive']
        send = data['send']
        return cls(guild, receive, send)
