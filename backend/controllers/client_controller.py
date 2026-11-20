import os
from typing import Any, Callable
from PIL import Image, ImageOps
from pathlib import Path
from flask import current_app, g
from werkzeug.datastructures import FileStorage
from util.auth import new_token
from models.claim import Claim, ClaimDTO, ClaimState, CLAIM_STATE_TIMEOUTS
from entities.exceptions import ClaimInProgressException, InvalidClaimException, UserExistsException
from cache import Cache
from models.game import Game
from models.user import User, UserDTO
from models.gift import Gift
from models.vote import Vote
from pillow_heif import register_heif_opener

register_heif_opener()

def login(game_id: str, name: str) -> User:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    user: User | None = game.get_user(name)
    
    if user is None:
        user = User(name)
        user.token = new_token()
        game.add_user(user)
    elif not (user.token == '' or user.token == None):
        raise UserExistsException
    else:
        user.token = new_token()
        game.token_map[user.token] = user.get_id()
    cache.store_game(game)
    return user

def logout(user_id: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    player = game.players[user_id]
    player.token = None

    cache.store_game(game)
    

def vote(voter_id: str, target_id: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    game.add_vote(voter_id, target_id)

    cache.store_game(game)

def get_user_info(user_id: str) -> UserDTO:
    game: Game = g.game

    if not game.players:
        return {}
    
    user: User | None = game.players[user_id] if user_id in game.players else None
    if not user:
        return {}
    
    return UserDTO.from_model(user, g.role, True)

def get_user_phase(user_id: str) -> dict[str, Any]:
    game: Game = g.game

    if not game.players:
        return { "phase": "UNREGISTERED" }

    return { "phase": game.players[user_id].phase if user_id in game.players else "UNREGISTERED" }

def open_gift(user_id: str, description: str, file: FileStorage | None = None) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game


    if file is not None:
        gift: Gift = next(g for g in game.gifts.values() if not g.opened) # Next unopened gift
        def post_processing() -> None:

            # Update game state
            gift.image_version += 1
            gift.image_path = f"api/{game.id}/gifts/{gift.get_id()}/image?version={gift.image_version}"
            game.open_gift(description, user_id)
        
            # Commit to store
            cache.store_game(game)
        
        
        upload_file(file, "gift_images", f"{gift.get_id()}.jpg", post_processing)
    else:
        game.open_gift(description, user_id)
        cache.store_game(game)
    

def get_result(user_id: str) -> dict[str, Any]:
    game: Game = g.game

    result: dict[str, Any] = { "self_vote_score": 0, "vote_score": 0, "gift_score": 0, "sabotage_score": 0, "target_correct": 0, "target_wrong": 0, "rounds": []}

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

def upload_avatar(user_id: str, file: FileStorage) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game


    def post_processing() -> None:
        player: User = game.players[user_id]

        # Update game state
        player.avatar_version += 1
        player.avatar_path = f"api/{game.id}/players/{user_id}/avatar?version={player.avatar_version}"
    
        # Commit to store
        cache.store_game(game)
    
    
    upload_file(file, "avatars", f"{user_id}.jpg", post_processing)

                
def make_claim(game_id: str, player_name: str) -> Claim:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    if player_name in game.claim_map:
        claim_id: str = game.claim_map[player_name]
        claim: Claim = game.get_claim(claim_id)

        # Allow re-claiming if old claim has timed out (timeout thresholds are different for each state)
        if claim.get_time_delta() > CLAIM_STATE_TIMEOUTS[claim.get_state()]:
            claim.refresh_token()
            claim.set_state(ClaimState.PENDING)
        else:
            raise ClaimInProgressException

        
    else:
        player: User = next(user for user in game.players.values() if user.name == player_name)
        claim: Claim = game.add_claim(player_name, player.get_id())

        
    cache.store_game(game)

    return claim


def get_claim(claim_id: str) -> ClaimDTO:
    game: Game = g.game

    claim: Claim = game.get_claim(claim_id)

    if Claim is None or claim.get_time_delta() > CLAIM_STATE_TIMEOUTS[claim.get_state()]:
        raise InvalidClaimException

    return ClaimDTO.from_model(claim)

def redeem_claim(claim_id: str) -> User:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    claim: Claim | None = game.get_claim(claim_id)

    if claim is None:
        raise InvalidClaimException

    user: User = game.players[claim.get_player_id()]

    claim.set_state(ClaimState.REDEEMED)
    cache.store_game(game)

    return user


def upload_file(file: FileStorage, base_dir: str, file_name: str, post_processing: Callable):
    game: Game = g.game
    
    # Check file size (limit 4MB)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > 8 * 1024 * 1024:
        raise Exception("File too large (max 4MB)")

    # Determine storage path
    # current_app.root_path is 'backend'
    base_dir = Path(current_app.root_path) / "static" / base_dir
    game_dir = base_dir / game.id
    game_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = game_dir / file_name
    
    try:
        # Open the image from the file stream
        img = Image.open(file.stream)
        img = ImageOps.exif_transpose(img)
        
        # Convert to RGB (handles HEIC/HEIF/PNG transparency)
        if img.mode in ("RGBA", "P") or img.mode != "RGB":
            img = img.convert("RGB")
            
        # Save to the destination
        img.save(filepath, "JPEG", quality=90)
        
        # Update game state
        post_processing()
        
    except Exception as e:
        # Rollback: delete the file if it was created
        if filepath.exists():
            filepath.unlink()
        raise e