from cache import Cache
from models.game import Game
from models.user import User
from models.gift import Gift
from models.vote import Vote

def login(game_id: str, name: str) -> str:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    user: User = User(name)
    game.add_user(user)

    cache.store_game(game)
    return user.get_id()

def vote(game_id: str, voter_id: str, target_id: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    game.add_vote(voter_id, target_id)

    cache.store_game(game)

def get_user_phase(game_id: str, user_id: str) -> dict:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    if not game or not game.players:
        return { "phase": "UNREGISTERED" }

    return { "phase": game.players[user_id].phase if user_id in game.players else "UNREGISTERED" }

def add_gift(game_id: str, user_id: str, description: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    game.add_gift(description, user_id)

    cache.store_game(game)
    
def get_result(game_id: str, user_id: str) -> dict:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    user_gift: Gift = [gift for gift in game.gifts.values() if gift.owner == user_id][0]

    result: dict = { "self_vote_score": 0, "vote_score": 0, "gift_score": 0, "sabotage_score": 0, "target_correct": 0, "target_wrong": 0, "rounds": []}

    for round in game.rounds:
        round_gift: Gift = game.gifts[round.gift_id]
        result["rounds"].append({"voted": False})

        if round.valid and round_gift.owner == user_id:
            result["gift_score"] += 1

        for vote_id in round.votes:
            vote: Vote = game.votes[vote_id]
            correct_vote: bool = vote.target_id == round_gift.owner

            # The vote belongs to the user
            if vote.voter_id == user_id:
                sabotage: bool = (vote.target_id == vote.voter_id or round_gift.owner == user_id) and not correct_vote
                result["rounds"][round.get_round_number()] = {
                    "voted": True,
                    "gift": round_gift.description,
                    "valid": round.valid,
                    "target": game.players[vote.target_id].name,
                    "correct": correct_vote,
                    "sabotage": sabotage
                }

                if sabotage:
                    result["sabotage_score"] += 1

                if round.valid:
                    if vote.target_id == user_id and correct_vote:
                        result["self_vote_score"] += 1
                    elif correct_vote:
                        result["self_vote_score"] += 1
                        result["vote_score"] += 1
            # The vote belongs to another user
            else:
                if round.valid:
                    if vote.target_id == user_id:
                        if correct_vote:
                            result["target_correct"] += 1 # De andere gebruiker stemde correct op deze gebruiker
                        else:
                            result["target_wrong"] += 1 # De andere gebruiker stemde foutief op deze gebruiker
    return result

                
