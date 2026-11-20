from __future__ import annotations
from dataclasses import dataclass

from uuid import uuid4
from models.dto import DTO, UNSET, _Unset
from entities.enums import UserPhase

class User():
    @classmethod
    def from_json(cls, json: dict) -> User:
        user: User = User(json["name"])
        user.__id = json["_User__id"]
        user.is_host = json["is_host"]
        user.phase = json.get("phase", UserPhase.WAITING)
        user.has_opened_gift = json.get("has_opened_gift", False)
        user.is_finished = json.get("is_finished", False)
        user.avatar_path = json.get("avatar_path")
        user.avatar_version = json.get("avatar_version", 0)
        user.token = json.get("token")
        return user

    def __init__(self, name: str, is_host=False) -> None:
        self.__id: str = uuid4().hex
        self.name: str = name
        self.is_host: bool = is_host
        self.phase: UserPhase = UserPhase.WAITING
        self.has_opened_gift: bool = False
        self.is_finished: bool = False
        self.avatar_path: str | None = None
        self.avatar_version: int = 0
        self.token: str = ''

    def get_id(self) -> str:
        return self.__id

    def to_json(self) -> dict:
        return self.__dict__

@dataclass
class UserDTO(DTO):
    id: str | _Unset = UNSET
    name: str | _Unset = UNSET
    avatarPath: str | None | _Unset = UNSET
    phase: UserPhase | _Unset = UNSET

    @classmethod
    def from_model(cls, user: User, role: str, own: bool = False) -> UserDTO:
        dtoUser: UserDTO = cls(id=user.get_id(), name=user.name, avatarPath=user.avatar_path)

        if role == "host" or own:
            dtoUser.phase = user.phase
        return dtoUser