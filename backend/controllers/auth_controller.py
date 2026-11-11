import hmac
import secrets
from functools import wraps
from flask import abort, g, jsonify, request

from cache import Cache
from models.game import Game

def new_token() -> str:
    return secrets.token_urlsafe(16)   # 128 bits of randomness

def tokens_match(expected: str | None, given: str) -> bool:
    return bool(expected) and hmac.compare_digest(expected, given)

def set_auth_cookie(resp, name: str, token: str):
    resp.set_cookie(name, token, httponly=True, samesite="Lax",
                    max_age=60 * 60 * 24 * 7, path="/")
    return resp


def current_host(game: Game, game_id: str) -> bool:
    return tokens_match(game.host_token, request.cookies.get(f"host_{game_id}", ""))

def current_player(game: Game, game_id: str):
    token = request.cookies.get(f"player_{game_id}", "")
    print(token)
    user_id = game.token_map.get(token, None)
    print(user_id, game.players.get(user_id, None))
    return game.players.get(user_id, None) if user_id else None

def auth_required(*roles):
    """Allows the request if the caller authenticates as any of the given roles."""
    def decorator(view):
        @wraps(view)
        def wrapper(game_id, *args, **kwargs):
            cache: Cache = Cache.get_instance()

            game = cache.get_game(game_id) or abort(404)
            g.game, g.role, g.player = game, None, None

            if "host" in roles and current_host(game, game_id):
                g.role = "host"
            elif "player" in roles:
                player = current_player(game, game_id)
                if player is not None:
                    g.role, g.player = "player", player

            if g.role is None:
                return unauthorized(game_id)
            return view(*args, **kwargs)
        return wrapper
    return decorator

def unauthorized(game_id: str):
    resp = jsonify(error="unauthorized")
    resp.status_code = 401
    for role in ("host", "player"):
        resp.delete_cookie(f"{role}_{game_id}", path=f"/api/games/{game_id}")
    return resp