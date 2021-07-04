from model.model import Model


class UserDataModel(Model):
    def __init__(self, user_id: str, guild_id: str, exp: int, money: int):
        self.user_id = user_id
        self.guild_id = guild_id
        self.exp = exp
        self.money = money

    @classmethod
    def model_factory(cls, data):
        user_id = data['_id']['user']
        guild_id = data['_id']['guild']
        exp = data['exp']
        money = data['money']
        return cls(user_id, guild_id, exp, money)
