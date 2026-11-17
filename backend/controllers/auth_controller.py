from functools import wraps
from flask import abort, g, jsonify, request

from cache import Cache

from util.auth import tokens_match
from util.routing_utils import game_does_not_exist

from entities.exceptions import InvalidGameException
from models.claim import Claim
from models.game import Game


def current_host(game: Game, game_id: str) -> bool:
    return tokens_match(game.host_token, request.cookies.get(f"host_{game_id}", ""))

def current_player(game: Game, game_id: str):
    token = request.cookies.get(f"player_{game_id}", "")
    user_id = game.token_map.get(token, None)
    return game.players.get(user_id, None) if user_id else None

def is_claimant(game: Game, game_id: str, claim_id: str) -> bool:
    claim: Claim = game.get_claim(claim_id)
    if claim is None:
        return False

    return tokens_match(claim.get_token(), request.cookies.get(f"claimant_{game_id}", ""))

def auth_required(*roles):
    """Allows the request if the caller authenticates as any of the given roles."""
    def decorator(view):
        @wraps(view)
        def wrapper(game_id, *args, **kwargs):
            cache: Cache = Cache.get_instance()

            try:
                game = cache.get_game(game_id)
            except InvalidGameException:
                abort(game_does_not_exist())
            g.game, g.role, g.player = game, None, None

            if "host" in roles and current_host(game, game_id):
                g.role = "host"
            elif "player" in roles:
                player = current_player(game, game_id)
                if player is not None:
                    g.role, g.player = "player", player
            elif "claimant" in roles:
                claim_id: str = kwargs["claim_id"] if kwargs["claim_id"] != "me" else request.cookies.get(f"claim_id_{game_id}", "")
                if "claim_id" in kwargs and is_claimant(game, game_id, claim_id=claim_id):
                    g.role = "claimant"

            if g.role is None:
                return unauthorized(game_id, roles)
            return view(*args, **kwargs)
        return wrapper
    return decorator

def unauthorized(game_id: str, expected_roles: list[str]):
    resp = jsonify(error="unauthorized")
    resp.status_code = 401
    for role in expected_roles:
        resp.delete_cookie(f"{role}_{game_id}", path=f"/")

    if "claimant" in expected_roles:
        resp.delete_cookie(f"claim_id_{game_id}")
    
    return resp