from typing import Any

from cache import Cache
from models.game import Game
from models.gift import Gift
from models.vote import Vote
from models.round import Round
from entities.enums import UserPhase
from entities.exceptions import OngoingRoundException, InvalidRoundException
from flask import g


def delete_player(user_id: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    del game.players[user_id]
    cache.store_game(game)

def new_round() -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    game.new_round()
    cache.store_game(game)

    cache.store_game(game)

def get_round_progress() -> dict[str, str | Any]:
    game: Game = g.game

    players: list[dict[str, str | bool]] = [{"name": player.name, "voted": player.phase == UserPhase.WAITING } for player in game.get_players()]
    gift: Gift | None = game.gifts.get(game.current_round().gift_id, None)

    return {"players": sorted(players, key=lambda player: player["name"]), "gift": gift.description if gift else None, "invalid": game.is_round_invalid()}

def reset_round() -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    game.reset_round()
    cache.store_game(game)

def get_round_result() -> dict[str, Any]:
    game: Game = g.game

    if not game.is_round_finished():
        raise OngoingRoundException()
    if game.is_round_invalid():
        raise InvalidRoundException()

    player_results: dict[str, Any] = {player.get_id(): {"name": player.name, "votes": 0, "avatarPath": player.avatar_path, "userId": player.get_id()} for player in game.get_players()}

    for vote_id in game.current_round().votes:
        vote: Vote = game.votes[vote_id]
        if game.self_vote or vote.target_id != vote.voter_id:
            player_results[vote.target_id]["votes"] += 1

    round: Round = game.current_round()
    gift: Gift = game.gifts[round.gift_id]
    round_result: dict[str, Any] = { "roundNumber": round.get_round_number(), "gift": gift.description, "playerResults": player_results}

    return round_result

def get_game_phase() -> dict[str, Any]:
    game: Game = g.game

    return {"phase": game.phase}

def assign_gift() -> bool:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    result: bool = game.assign_gift()

    cache.store_game(game)

    return result

def get_result() -> list[dict[str, Any]]:
    game: Game = g.game

    user_map: dict[str, Any] = {player.get_id(): {"name": player.name, "gift_score": 0, "vote_score": 0, "self_vote_score": 0, "target_correct": 0, "target_wrong": 0, "sabotage_score": 0, "userId": player.get_id(), "avatarPath": player.avatar_path} for player in game.get_players()}
   
    for round in game.rounds:
        round_gift: Gift = game.gifts[round.gift_id]

        if round_gift.owner is None:
            continue

        if round.valid:
            user_map[round_gift.owner]["gift_score"] += 1

        for vote_id in round.votes:
            vote: Vote = game.votes[vote_id]
            correct_vote: bool = vote.target_id == round_gift.owner

            # User did not claim their own gift or tried to claim someone else's gift
            if vote.voter_id == "user-1":
                print(vote.voter_id, vote_id, correct_vote, vote.target_id == vote.voter_id, round_gift.owner == vote.voter_id)
            if (vote.target_id == vote.voter_id or round_gift.owner == vote.voter_id) and not correct_vote:
                user_map[vote.voter_id]["sabotage_score"] += 1

            if round.valid:
                if vote.target_id != vote.voter_id:
                    if correct_vote:
                        user_map[vote.voter_id]["vote_score"] += 1
                        user_map[vote.voter_id]["self_vote_score"] += 1
                        user_map[vote.target_id]["target_correct"] += 1
                    else:
                        user_map[vote.target_id]["target_wrong"] += 1
                else:
                    if correct_vote:
                        user_map[vote.voter_id]["self_vote_score"] += 1

    return [result for result in user_map.values()]