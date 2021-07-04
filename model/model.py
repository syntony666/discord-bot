import abc


class Model(abc.ABC):
    @classmethod
    def model_factory(cls, data):
        pass
