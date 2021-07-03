class LevelService:
    def __init__(self, total_exp):
        self.total_exp = total_exp
        self.level = None
        self.needed_exp = None
        self.required_exp = None

    def get_level(self):
        if self.level is not None:
            return self.level
        self.level = 0
        while self.total_exp > self.__get_level_exp(self.level):
            self.level += 1
        return self.level

    def get_needed_exp(self):
        if self.needed_exp is not None:
            return self.needed_exp
        return self.__get_level_exp(self.get_level())

    def get_required_exp(self):
        if self.required_exp is not None:
            return self.required_exp
        return self.get_needed_exp() - self.total_exp

    def __get_level_exp(self, level):
        if level == 0:
            return 100
        return int(1 / 6 * level * (level + 1) * (10 * level + 155) + 100 * (level + 1) + 0.5)
