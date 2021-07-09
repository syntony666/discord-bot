from core.database import Database
from core.exception import DataExist, DataNotExist
from database.create_builder import CreateBuilder
from database.find_builder import FindBuilder
from model.user_data_model import UserDataModel


class UserDataDao(Database):
    def __init__(self):
        super(UserDataDao, self).__init__()
        self.col_name = 'user_data'

    def get_data(self, user: str, guild: str):
        find_builder = FindBuilder(self.col_name)
        find_builder.collect_query('_id.user', str(user))
        find_builder.collect_query('_id.guild', str(guild))
        return find_builder.get_result(UserDataModel)

    def create_data(self, user: str, guild: str):
        create_builder = CreateBuilder(self.col_name)
        create_builder.collect_query('_id.user', str(user))
        create_builder.collect_query('_id.guild', str(guild))

        create_builder.collect_data_id('user', str(user))
        create_builder.collect_data_id('guild', str(guild))
        create_builder.collect_data('exp', 0)
        create_builder.collect_data('money', 0)
        create_builder.get_result()

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
