from typing import Type

from core.database import Database
from core.exception import DataExist
from model.model import Model


class CreateBuilder(Database):
    def __init__(self, col_name):
        super().__init__()
        self.col_name = col_name
        self.query = dict()
        self.data = dict()
        self.data['_id'] = dict()

    def collect_query(self, attr_name, data):
        self.query[attr_name] = data

    def collect_data(self, attr_name, data):
        self.data[attr_name] = data

    def collect_data_id(self, attr_name, data):
        self.data['_id'][attr_name] = data

    def get_result(self):
        response = self._find_data(self.col_name, self.query)
        if len([x for x in response]) != 0:
            raise DataExist
        self._create_data(self.col_name, self.data)
