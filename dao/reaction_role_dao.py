from discord import Emoji

from core.database import Database
from core.exception import DataExist, DataNotExist
from database.create_builder import CreateBuilder
from database.delete_builder import DeleteBuilder
from database.find_builder import FindBuilder
from model.reaction_role_model import ReactionRoleModel


class ReactionRoleDao(Database):
    def __init__(self):
        super(ReactionRoleDao, self).__init__()
        self.col_name = 'reaction_role'

    def get_data(self, guild: str, role=None, message=None, emoji=None):
        find_builder = FindBuilder(self.col_name)
        find_builder.collect_query('_id.guild', str(guild))
        find_builder.collect_uncessary_query('_id.role', str(role))
        find_builder.collect_uncessary_query('message', str(message))
        find_builder.collect_uncessary_query('emoji', emoji)
        return find_builder.get_result(ReactionRoleModel)

    def create_data(self, guild: str, role: str, message: str, emoji: Emoji):
        create_builder = CreateBuilder(self.col_name)
        create_builder.collect_query('_id.guild', str(guild))
        create_builder.collect_query('_id.role', str(role))

        create_builder.collect_data_id('guild', str(guild))
        create_builder.collect_data_id('role', str(role))
        create_builder.collect_data('message', str(message))
        create_builder.collect_data('emoji', str(emoji))
        create_builder.get_result()

    def update_data(self, role: str, message=None, emoji=None):
        role_id = str(role)
        if len(self.get_data(role_id)) == 0:
            raise DataNotExist
        query = dict()
        query['_id'] = {'role': role_id}
        data = dict()
        data['$set'] = dict()
        if message is not None:
            message_id = str(message)
            data['$set']['message'] = message_id
        if emoji is not None:
            data['$set']['emoji'] = emoji
        self._update_data(self.col_name, query, data)

    def del_data(self, guild: str, role=None, message=None):
        delete_builder = DeleteBuilder(self.col_name)
        delete_builder.collect_query('_id.guild', str(guild))
        delete_builder.collect_uncessary_query('_id.role', str(role))
        delete_builder.collect_uncessary_query('message', message)
        delete_builder.get_result()
