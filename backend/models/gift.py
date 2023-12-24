from __future__ import annotations

from uuid import uuid4
import json

class Gift():
    @classmethod
    def from_json(cls, json: dict) -> Gift:
        gift: Gift = Gift(json["description"])
        gift.__id = json["_Gift__id"]
        gift.owner = json.get("owner", None)
        gift.in_play = json.get("in_play", True)
        gift.last_accessed = json.get("last_accessed", 0)
        gift.assigned = json.get("assigned", False)
        return gift
    
    def __init__(self, description: str) -> None:
        self.__id: str = uuid4().hex
        self.description: str = description
        self.owner: str | None = None
        self.in_play: bool = True
        self.last_accessed: int = 0
        self.assigned: bool = False

    def get_id(self) -> str:
        return self.__id

    def to_json(self) -> dict:
        return self.__dict__