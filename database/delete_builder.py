from core.database import Database


class DeleteBuilder(Database):
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

    def get_result(self):
        response = self._find_data(self.col_name, self.query)
        if response is None:
            return []
        reply = [model.model_factory(found)
                 for found in response]
        return reply
