from __future__ import annotations

from uuid import uuid4
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
        return user

    def __init__(self, name: str, is_host=False) -> None:
        self.__id: str = uuid4().hex
        self.name: str = name
        self.is_host: bool = is_host
        self.phase: UserPhase = UserPhase.WAITING
        self.has_opened_gift: bool = False
        self.is_finished: bool = False

    def get_id(self) -> str:
        return self.__id

    def to_json(self) -> dict:
        return self.__dict__