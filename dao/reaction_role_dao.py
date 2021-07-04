from discord import Emoji

from core.database import Database
from core.exception import DataExist, DataNotExist
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
        role_id = str(role)
        message_id = str(message)
        guild_id = str(guild)
        if len(self.get_data(role_id)) != 0:
            raise DataExist
        query = dict()
        query['_id'] = {'guild': guild_id, 'role': role_id}
        query['message'] = message_id
        query['emoji'] = emoji
        self._create_data(self.col_name, query)

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
        query = dict()
        guild_id = str(guild)
        if len(self.get_data(guild_id, role, message)) == 0:
            raise DataNotExist
        query['_id.guild'] = guild_id
        if role is not None:
            role_id = str(role)
            query['_id.role'] = role_id
        if message is not None:
            message_id = str(message)
            query['message'] = message_id
        self._del_data(self.col_name, query)
