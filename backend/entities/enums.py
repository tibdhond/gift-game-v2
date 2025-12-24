from enum import Enum

class UserPhase(str, Enum):
    WAITING = "WAITING"
    VOTING = "VOTING"
    FINISHED = "FINISHED"
    GIFT_OPENING = "GIFT_OPENING"
    UNREGISTERED = "UNREGISTERED"

class GamePhase(str, Enum):
    STARTING = "STARTING" # Game is being set up
    EARLY = "EARLY" # Gifts are still being created
    MID = "MID" # All gifts have been created
    FINISHED = "FINISHED"