from __future__ import annotations
import json

class Round():

    @classmethod
    def from_json(cls, json: dict) -> Round:
        round: Round = Round(json["_Round__id"])
        round.votes = json["votes"]
        round.valid = json.get("valid", True)
        round.gift_id = json.get("gift_id", None)

        return round

    def __init__(self, round_number: int, gift_id: str = None) -> None:
        self.__id: int = round_number
        self.votes: list[str] = []
        self.gift_id: str = gift_id
        self.valid: bool = True

    def get_round_number(self) -> int:
        return self.__id

    def to_json(self) -> dict:
        return self.__dict__