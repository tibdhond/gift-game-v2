from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from random import choices
import string
from uuid import uuid4
from datetime import datetime, timedelta

from models.dto import DTO, _Unset, UNSET

from util.auth import new_token

class ClaimState(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    REDEEMED = "REDEEMED"

CLAIM_STATE_TIMEOUTS: dict[ClaimState, int] = {
   ClaimState.PENDING: 300, # 5 min
   ClaimState.APPROVED: 120, # 2 min
   ClaimState.DENIED: 60, # 1 min
   ClaimState.REDEEMED: 60 # 1 min
}


class Claim():
    @classmethod
    def from_json(cls, json: dict) -> Claim:
        claim: Claim = Claim(json["_Claim__player_name"], json["_Claim__player_id"])
        claim.__id = json["_Claim__id"]
        claim.__state = json["_Claim__state"]
        claim.__token = json["_Claim__token"]
        claim.__last_modified = datetime.fromisoformat(json["_Claim__last_modified"])
        claim.__key = json["_Claim__key"]
        return claim
    
    def __init__(self, player_name: str, player_id: str) -> None:
        self.__id: str = uuid4().hex
        self.__player_name: str = player_name
        self.__state: ClaimState = ClaimState.PENDING
        self.__token: str = new_token()
        self.__player_id: str = player_id
        self.__last_modified = datetime.now()
        self.__key = ''.join(choices(string.ascii_uppercase + string.digits, k=4))

    def get_id(self) -> str:
        return self.__id

    def get_player_id(self) -> str:
        return self.__player_id

    def set_player_id(self, player_id: str) -> None:
        self.__player_id = player_id
        self.__last_modified = datetime.now()

    def get_player_name(self) -> str:
        return self.__player_name
    
    def set_player_name(self, player_name: str) -> None:
        self.__player_name = player_name
        self.__last_modified = datetime.now()

    def get_state(self) -> ClaimState:
        return self.__state
    
    def set_state(self, state: ClaimState) -> None:
        self.__state = state
        self.__last_modified = datetime.now()

    def get_token(self) -> str:
        return self.__token

    def refresh_token(self) -> None:
        self.token = new_token()
        self.__key = ''.join(choices(string.ascii_uppercase + string.digits, k=4))
        self.__last_modified = datetime.now()

    def get_last_modified(self) -> datetime:
        return self.__last_modified

    def get_time_delta(self) -> int:
        return (datetime.now() - self.__last_modified).total_seconds()

    def get_key(self) -> str:
        return self.__key
        
    def to_json(self) -> dict:
        as_dict: dict = dict(self.__dict__)
        as_dict["_Claim__last_modified"] = self.__last_modified.isoformat()
        return as_dict


@dataclass
class ClaimDTO(DTO):
    id: str | _Unset = UNSET
    state: ClaimState | _Unset = UNSET
    playerName: str | _Unset = UNSET
    key: str | _Unset = UNSET

    @classmethod
    def from_model(cls: ClaimDTO, claim: Claim) -> ClaimDTO:
        return cls(id=claim.get_id(), state=claim.get_state(), key=claim.get_key(), playerName=claim.get_player_name())