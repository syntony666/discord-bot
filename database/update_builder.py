from core.database import Database
from core.exception import DataNotExist


class UpdateBuilder(Database):
    def __init__(self, col_name):
        super().__init__()
        self.col_name = col_name
        self.query = dict()
        self.data = dict()
        self.data['$set'] = dict()

    def collect_query(self, attr_name, data):
        self.query[attr_name] = data

    def collect_data(self, attr_name, data):
        if data is None:
            return
        self.data['$set'][attr_name] = data

    def get_result(self):
        response = self._find_data(self.col_name, self.query)
        if len([x for x in response]) == 0:
            raise DataNotExist
        self._update_data(self.col_name, self.query, self.data)
