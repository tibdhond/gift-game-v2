import socket

from models.game import Game
from cache import Cache
from models.user import User

def new_game() -> str:
    cache: Cache = Cache.get_instance()

    game: Game = Game()
    cache.store_game(game)

    return game.id

def get_players(game_id: str, filtered: bool = False) -> list[User]:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    return [{"id": player.get_id(), "name": player.name, "avatarPath": player.avatar_path} for player in sorted(game.get_players(), key=lambda user: user.name) if not filtered or not player.is_finished]


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()