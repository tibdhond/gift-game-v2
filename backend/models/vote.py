from __future__ import annotations

from uuid import uuid4
import json


class Vote():
    @classmethod
    def from_json(cls, json: dict):
        vote: Vote = Vote(json["voter_id"], json["target_id"], json["gift_id"])
        vote.__id = json["_Vote__id"]
        return vote
    
    def __init__(self, voter_id: str, target_id: str, gift_id: str) -> None:
        self.__id: str = uuid4().hex
        self.voter_id: str = voter_id
        self.target_id: str = target_id
        self.gift_id: str = gift_id

    def get_id(self) -> str:
        return self.__id
    
    def to_json(self) -> dict:
        return self.__dict__
