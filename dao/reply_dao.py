from core.database import Database
from core.exception import DataNotExist, DataExist
from database.find_builder import FindBuilder
from model.reply_model import ReplyModel


class ReplyDao(Database):
    def __init__(self):
        super(ReplyDao, self).__init__()
        self.col_name = 'reply'

    def get_data(self, guild: str, receive=None):
        find_builder = FindBuilder(self.col_name)
        find_builder.collect_query('_id.guild', str(guild))
        find_builder.collect_uncessary_query('_id.receive', receive)
        return find_builder.get_result(ReplyModel)

    def search_data(self, guild: str, receive: str):
        guild_id = str(guild)
        query = {'_id.receive': {'$regex': receive}, '_id.guild': guild_id}
        response = self._find_data(self.col_name, query)
        if response is None:
            return []
        reply = [ReplyModel(guild_id, found['_id']['receive'], found['send'])
                 for found in response]
        return reply

    def create_data(self, guild: str, receive: str, send: str):
        guild_id = str(guild)
        if len(self.get_data(guild_id, receive)) != 0:
            raise DataExist
        query = dict()
        query['_id'] = {'guild': guild_id, 'receive': receive}
        query['send'] = send
        self._create_data(self.col_name, query)

    def update_data(self, guild: str, receive: str, send: str):
        guild_id = str(guild)
        if len(self.get_data(guild_id, receive)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'guild': guild_id, 'receive': receive}
        data = dict()
        data['$set'] = dict()
        data['$set']['send'] = send
        self._update_data(self.col_name, query, data)

    def del_data(self, guild: str, receive: str):
        guild_id = str(guild)
        if len(self.get_data(guild_id, receive)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'guild': guild_id, 'receive': receive}
        self._del_data(self.col_name, query)
