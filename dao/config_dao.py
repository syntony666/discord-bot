from core.exception import DataExist, DataNotExist
from database.find_builder import FindBuilder
from model.config_model import ConfigModel
from core.database import Database


class ConfigDao(Database):
    def __init__(self):
        super(ConfigDao, self).__init__()
        self.col_name = 'config'

    def get_data(self, guild: str):
        find_builder = FindBuilder(self.col_name)
        find_builder.collect_query('_id.guild', str(guild))
        return find_builder.get_result(ConfigModel)

    def create_data(self, guild: str):
        guild_id = str(guild)
        if len(self.get_data(guild_id)) != 0:
            raise DataExist
        query = dict()
        query['_id'] = {'guild': guild_id}
        query['join_channel'] = '0'
        query['join_message'] = ''
        query['remove_channel'] = '0'
        query['remove_message'] = ''
        self._create_data(self.col_name, query)

    def update_data(self, guild: str, join_channel=None, join_message=None, remove_channel=None, remove_message=None):
        guild_id = str(guild)
        if len(self.get_data(guild_id)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'guild': guild_id}
        data = dict()
        data['$set'] = dict()
        if join_channel is not None:
            join_channel = str(join_channel)
            data['$set']['join_channel'] = join_channel
        if join_message is not None:
            join_message = str(join_message)
            data['$set']['join_message'] = join_message
        if remove_channel is not None:
            remove_channel = str(remove_channel)
            data['$set']['remove_channel'] = remove_channel
        if remove_message is not None:
            remove_message = str(remove_message)
            data['$set']['remove_message'] = remove_message
        self._update_data(self.col_name, query, data)

    def del_data(self, guild: str):
        guild_id = str(guild)
        if len(self.get_data(guild_id)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'guild': guild_id}
        self._del_data(self.col_name, query)
