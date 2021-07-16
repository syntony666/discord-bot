from core.database import Database
from core.exception import DataNotExist
from database.create_builder import CreateBuilder
from database.delete_builder import DeleteBuilder
from database.find_builder import FindBuilder
from database.update_builder import UpdateBuilder
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
        create_builder = CreateBuilder(self.col_name)
        create_builder.collect_query('_id.guild', str(guild))
        create_builder.collect_query('_id.receive', receive)

        create_builder.collect_data_id('guild', str(guild))
        create_builder.collect_data_id('receive', receive)
        create_builder.collect_data('send', send)
        create_builder.get_result()

    def update_data(self, guild: str, receive: str, send: str):
        update_builder = UpdateBuilder(self.col_name)
        update_builder.collect_query('_id.guild', str(guild))
        update_builder.collect_query('_id.receive', str(receive))

        update_builder.collect_data('send', send)
        update_builder.get_result()

    def del_data(self, guild: str, receive: str):
        delete_builder = DeleteBuilder(self.col_name)
        delete_builder.collect_query('_id.guild', str(guild))
        delete_builder.collect_query('_id.receive', receive)
        delete_builder.get_result()
