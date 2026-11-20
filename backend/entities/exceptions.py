class InvalidRoundException(BaseException):
    pass

class OngoingRoundException(BaseException):
    pass

class UserHasVotedException(BaseException):
    pass

class GameFinishedException(BaseException):
    pass

class GiftOpenForbiddenException(BaseException):
    pass

class NoUnopenedGiftException(BaseException):
    pass

class InvalidGameException(BaseException):
    pass

class UserExistsException(BaseException):
    pass

class GameHasHostException(BaseException):
    pass

class InvalidClaimException(BaseException):
    pass

class ClaimInProgressException(BaseException):
    pass

class BadRequestException(BaseException):
    pass