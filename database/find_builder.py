from typing import Type

from core import database
from core.database import Database
from model.model import Model


class FindBuilder(Database):
    def __init__(self, col_name):
        super().__init__()
        self.col_name = col_name
        self.query = dict()

    def collect_query(self, attr_name, data):
        self.query[attr_name] = data

    def collect_uncessary_query(self, attr_name, data):
        if data is None:
            return
        self.query[attr_name] = data

    def get_query(self):
        return self.query

    def get_result(self, model: Type[Model]):
        response = self._find_data(self.col_name, self.query)
        if response is None:
            return []
        reply = [model.model_factory(found)
                 for found in response]
        return reply
