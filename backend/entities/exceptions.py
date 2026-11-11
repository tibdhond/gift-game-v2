class InvalidRoundException(BaseException):
    pass

class OngoingRoundException(BaseException):
    pass

class UserHasVotedException(BaseException):
    pass

class GameFinishedException(BaseException):
    pass

class GiftCreationException(BaseException):
    pass

class InvalidGameException(BaseException):
    pass

class UserExistsException(BaseException):
    pass

class GameHasHostException(BaseException):
    pass