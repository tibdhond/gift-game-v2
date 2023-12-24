from models.game import Game
from cache import Cache
from models.user import User

def new_game() -> str:
    cache: Cache = Cache.get_instance()

    game: Game = Game()
    cache.store_game(game)

    return game.id

def get_players(game_id: str) -> list[User]:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    return [{"id": player.get_id(), "name": player.name} for player in sorted(game.get_players(), key=lambda user: user.name)]

