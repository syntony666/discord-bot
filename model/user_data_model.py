class UserDataModel:
    def __init__(self, user_id: str, guild_id: str, exp: int, money: int):
        self.user_id = user_id
        self.guild_id = guild_id
        self.exp = exp
        self.money = money
