from __future__ import annotations
import os
import json
from flask import current_app
from pathlib import Path

from entities.exceptions import InvalidGameException
from models.game import Game


class Cache():
    __instance: Cache | None = None

    @classmethod
    def get_instance(cls) -> Cache:
        return Cache.__instance if Cache.__instance is not None else Cache()

    def __init__(self) -> None:
        if Cache.__instance is not None:
            raise Exception("Only one instance of the cache can exist")
        else:
            Cache.__instance = self
            self.games: dict[str, Game] = {}

    def get_game(self, id: str) -> Game:
        ROOT_PATH = Path(current_app.root_path)
        if not id in self.games:
            if os.path.exists(f"{ROOT_PATH}/store/{id}.json"):
                with open(f"{ROOT_PATH}/store/{id}.json", "r") as f:
                    self.games[id] = self.validate_and_fix_stored_game(Game.from_json(json.load(f)))
            else:
                raise InvalidGameException()
        return self.games[id]
        
    def store_game(self, game: Game | None) -> None:
        ROOT_PATH = Path(current_app.root_path)
        if game is None:
            raise Exception("Attempted to store empty Game state")
        self.games[game.id] = game

        game_as_json: str = game.to_json()
        with open(f"{ROOT_PATH}/store/{game.id}.json", "w+") as f:
            f.write(game_as_json)


    # Check that stored files still match newer rules
    # Should only contain quick checks, may contain longer fixes
    def validate_and_fix_stored_game(self, game: Game) -> Game:
        # Check that there's a gift for every player
        modified: bool = False
        if len(game.gifts) < len(game.players) - 1:
            for _ in range(len(game.players) - 1 - len(game.gifts)):
                game.add_gift()
            modified = True

        if modified:
            self.store_game(game)
        return game