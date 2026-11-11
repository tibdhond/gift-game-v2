import os
from typing import Any
from PIL import Image
from pathlib import Path
from flask import current_app, g
from werkzeug.datastructures import FileStorage
from controllers.auth_controller import new_token
from entities.exceptions import UserExistsException
from cache import Cache
from models.game import Game
from models.user import User
from models.gift import Gift
from models.vote import Vote
from pillow_heif import register_heif_opener

register_heif_opener()

def login(game_id: str, name: str) -> User:
    cache: Cache = Cache.get_instance()
    game: Game = cache.get_game(game_id)

    user: User | None = game.get_user(name)
    
    if not user:
        user = User(name)
        user.token = new_token()
        game.add_user(user)
        cache.store_game(game)
    elif not (user.token == '' or user.token == None):
        raise UserExistsException
    else:
        user.token = new_token()
        game.token_map[user.token] = user.get_id()
        cache.store_game(game)
    return user

def vote(voter_id: str, target_id: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    game.add_vote(voter_id, target_id)

    cache.store_game(game)

def get_user_info(user_id: str) -> dict[str, Any]:
    game: Game = g.game

    if not game.players:
            return {}
    
    user: User | None = game.players[user_id] if user_id in game.players else None
    if not user:
        return {}
    
    return ({ "userId": user.get_id(), "name": user.name, "avatarPath": user.avatar_path })

def get_user_phase(user_id: str) -> dict[str, Any]:
    game: Game = g.game

    if not game.players:
        return { "phase": "UNREGISTERED" }

    return { "phase": game.players[user_id].phase if user_id in game.players else "UNREGISTERED" }

def add_gift(user_id: str, description: str) -> None:
    cache: Cache = Cache.get_instance()
    game: Game = g.game

    game.add_gift(description, user_id)

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
    
    player: User = game.players[user_id]
    # Check file size (limit 4MB)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > 4 * 1024 * 1024:
        raise Exception("File too large (max 4MB)")

    # Determine storage path
    # current_app.root_path is 'backend'
    base_dir = Path(current_app.root_path) / "static" / "avatars"
    game_dir = base_dir / game.id
    game_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = game_dir / f"{user_id}.jpg"
    
    try:
        # Open the image from the file stream
        img = Image.open(file.stream)
        
        # Convert to RGB (handles HEIC/HEIF/PNG transparency)
        if img.mode in ("RGBA", "P") or img.mode != "RGB":
            img = img.convert("RGB")
            
        # Save to the destination
        img.save(filepath, "JPEG", quality=90)
        
        # Update game state
        player.avatar_version += 1
        player.avatar_path = f"api/{game.id}/players/{user_id}/avatar?version={player.avatar_version}"
        
        # Commit to store
        cache.store_game(game)
        
    except Exception as e:
        # Rollback: delete the file if it was created
        if filepath.exists():
            filepath.unlink()
        raise e

                
