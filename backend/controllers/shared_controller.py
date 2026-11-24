import socket

from util.auth import new_token
from entities.exceptions import GameHasHostException, InvalidGameException
from models.game import Game
from cache import Cache
from models.user import User, UserDTO
from flask import g

def new_game() -> Game:
    cache: Cache = Cache.get_instance()

    game: Game = Game()
    game.host_token = new_token()
    cache.store_game(game)

    return game

def assign_host_token(game_id: str):
    cache: Cache = Cache.get_instance()

    game: Game = cache.get_game(game_id)
    if game.host_token == '':
        game.host_token = new_token()
        cache.store_game(game)
        return game
    raise GameHasHostException

def game_exists(game_id: str) -> bool:
    cache: Cache = Cache.get_instance()

    try:
        cache.get_game(game_id)
        return True
    except InvalidGameException:
        return False

def get_players(filtered: bool = False) -> list[User]:
    game: Game = g.game

    return [UserDTO.from_model(player, g.role, g.player and g.player.get_id() == player.get_id()) for player in sorted(game.get_players(), key=lambda user: user.name) if not filtered or not player.is_finished]

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()