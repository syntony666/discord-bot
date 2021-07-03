from discord import Emoji

from core.database import Database
from core.exception import DataExist, DataNotExist
from model.reaction_role_model import ReactionRoleModel


class ReactionRoleDao(Database):
    def __init__(self):
        super(ReactionRoleDao, self).__init__()
        self.col_name = 'reaction_role'

    def get_data(self, guild: str, role=None, message=None, emoji=None):
        query = dict()
        guild_id = str(guild)
        query['_id.guild'] = guild_id
        if role is not None:
            role_id = str(role)
            query['_id.role'] = role_id
        if message is not None:
            message_id = str(message)
            query['message'] = message_id
        if emoji is not None:
            query['emoji'] = emoji
        response = self._find_data(self.col_name, query)
        if response is None:
            return []
        reaction_role = [ReactionRoleModel(found['_id']['guild'], found['_id']['role'], found['message'], found['emoji'])
                         for found in response]
        return reaction_role

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
