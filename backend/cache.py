from __future__ import annotations
import os
import json
from flask import current_app
from pathlib import Path

from models.game import Game


class Cache():
    __instance: Cache = None

    @classmethod
    def get_instance(cls) -> Cache:
        return Cache.__instance if Cache.__instance is not None else Cache()

    def __init__(self) -> None:
        if Cache.__instance is not None:
            raise Exception("Only one instance of the cache can exist")
        else:
            Cache.__instance = self
            self.games: dict[str, Game] = {}

    def get_game(self, id: str) -> Game | None:
        ROOT_PATH = Path(current_app.root_path)
        if not id in self.games:
            if os.path.exists(f"{ROOT_PATH}/store/{id}.json"):
                with open(f"{ROOT_PATH}/store/{id}.json", "r") as f:
                    self.games[id] = Game.from_json(json.load(f))
            else:
                return None
        return self.games[id]
        
    def store_game(self, game: Game) -> None:
        ROOT_PATH = Path(current_app.root_path)
        if game is None:
            raise Exception("Attempted to store empty Game state")
        self.games[game.id] = game
        with open(f"{ROOT_PATH}/store/{game.id}.json", "w+") as f:
            f.write(game.to_json())

    