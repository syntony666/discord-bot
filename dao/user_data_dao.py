from core.database import Database
from core.exception import DataExist, DataNotExist
from model.user_data_model import UserDataModel


class UserDataDao(Database):
    def __init__(self):
        super(UserDataDao, self).__init__()
        self.col_name = 'user_data'

    def get_data(self, user: str, guild: str):
        user_id = str(user)
        guild_id = str(guild)
        query = dict()
        query['_id.guild'] = guild_id
        query['_id.user'] = user_id
        response = self._find_data(self.col_name, query)
        if response is None:
            return []
        reply = [UserDataModel(user_id, guild_id, found.exp, found.money)
                 for found in response]
        return reply

    def create_data(self, user: str, guild: str):
        user_id = str(user)
        guild_id = str(guild)
        if len(self.get_data(user_id, guild_id)) != 0:
            raise DataExist
        query = dict()
        query['_id'] = {'user': user_id, 'guild': guild_id}
        query['exp'] = 0
        query['money'] = 0
        self._create_data(self.col_name, query)

    def update_data(self, user: str, guild: str, exp: int = None, money: int = None):
        user_id = str(user)
        guild_id = str(guild)
        if len(self.get_data(user_id, guild_id)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'user': user_id, 'guild': guild_id}
        data = dict()
        if exp is not None:
            data['$set']['exp'] = exp
        if money is not None:
            data['$set']['money'] = money
        self._update_data(self.col_name, query, data)

    def del_data(self, user: str, guild: str):
        user_id = str(user)
        guild_id = str(guild)
        if len(self.get_data(user_id, guild_id)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'user': user_id, 'guild': guild_id}
        self._del_data(self.col_name, query)
