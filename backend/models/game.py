from __future__ import annotations

import string
import json
from random import choices, random, choice
import math

from models.round import Round
from models.vote import Vote
from models.gift import Gift
from models.user import User

from entities.enums import UserPhase, GamePhase

from entities.exceptions import *

class Game():
    @classmethod
    def from_json(cls, json: dict) -> Game:
        game: Game = Game()
        game.id: string = json["id"]
        game.host_id: str = json["host_id"]
        game.random: bool = json.get("random", False)
        game.self_vote: bool = json.get("self_vote", False)
        game.phase: GamePhase = json.get("phase", GamePhase.STARTING)
        game.rounds: list[Round] = [Round.from_json(round) for round in json["rounds"]]
        game.votes: list[Vote] = { id: Vote.from_json(vote) for (id, vote) in json["votes"].items() }
        game.players: list[User] = { id: User.from_json(user) for (id, user) in json["players"].items() }
        game.gifts: list[Gift] = { id: Gift.from_json(gift) for (id, gift) in json["gifts"].items() }

        return game

    def __init__(self):
        host_user: User = User('host', True)
        self.id: string = ''.join(choices(string.ascii_uppercase + string.digits, k=4))
        self.host_id: str = host_user.get_id()
        self.rounds: list[Round] = []
        self.votes: dict[str, Vote] = {}
        self.players: dict[str, User] = { self.host_id: host_user }
        self.gifts: dict[str, Gift] = {}
        self.random: bool = False
        self.self_vote: bool = False
        self.phase: GamePhase = GamePhase.STARTING

    def add_user(self, user: User) -> None:
        self.players[user.get_id()] = user

    def new_round(self) -> None:
        if len(self.rounds) > 0:
            if self.is_round_invalid():
                raise InvalidRoundException()
            if not self.is_round_finished():
                raise OngoingRoundException()
            
            # Link gift with owner
            current_round: Round = self.current_round()
            current_gift: Gift = self.gifts[current_round.gift_id]
            current_gift.owner = self.get_owner()[0] if current_gift.owner is None else current_gift.owner
        else: 
            self.phase = GamePhase.EARLY

        if self.phase == GamePhase.FINISHED:
            return
            
        round: Round = Round(len(self.rounds))
        self.rounds.append(round)

        if self.phase == GamePhase.MID:
            gifts: list[Gift] = sorted(self.get_unassigned_gifts(), key=lambda gift: gift.last_accessed)

            if self.random:
                length: int = len(gifts)
                z: int = (2 / (length - 1)) / length
                index: int = length - 1 - (math.floor(1 / 2 + math.sqrt(8 * random() + z) / (2 * math.sqrt(z))))
                gift: Gift = gifts[index]
            else: # Get oldest gift
                gift: Gift = gifts[0]

            # Link gift to round
            current_round = self.current_round()
            current_round.gift_id = gift.get_id()
            gift.last_accessed = current_round.get_round_number()

            
            for player_id in self.players.keys():
                self.set_player_phase(player_id, UserPhase.VOTING)
            
        else:
            player: User = choice([player for player in self.get_players() if not player.has_opened_gift])
            self.set_player_phase(player.get_id(), UserPhase.GIFT_OPENING)


    def add_gift(self, description: str, user_id: str) -> None:
        if self.phase != GamePhase.EARLY:
            raise GiftCreationException()
        
        player: User = self.players[user_id]
        if player.phase != UserPhase.GIFT_OPENING:
            raise GiftCreationException()
        player.has_opened_gift = True

        current_round: Round = self.current_round()
        gift: Gift = Gift(description)
        self.gifts[gift.get_id()] = gift
        current_round.gift_id = gift.get_id()
        gift.last_accessed = current_round.get_round_number()

        # Don't count host
        if len(self.gifts) == len(self.players)-1:
            self.phase = GamePhase.MID
        
            
        for player_id in self.players.keys():
            self.set_player_phase(player_id, UserPhase.VOTING)

    def assign_gift(self) -> bool:
        gift = self.gifts[self.current_round().gift_id]
        gift.assigned = True

        owner = gift.owner if gift.owner else self.get_owner()[0]
        
        player = self.players[owner]
        player.is_finished = True

        if len(self.get_unassigned_gifts()) == 0 and len(self.gifts) == len(self.players)-1:
            self.phase = GamePhase.FINISHED
            self.new_round() # Tie up loose ends (will not start new round due to GamePhase Finished)

            
            for player_id in self.players.keys():
                self.set_player_phase(player_id, UserPhase.FINISHED)

            return True
        else:
            self.new_round()
            return False

    def add_vote(self, voter_id: str, target_id: str) -> None:
        voter: User = self.players[voter_id]
        if voter.phase == UserPhase.WAITING:
            raise UserHasVotedException()
        if voter.phase == UserPhase.FINISHED:
            raise GameFinishedException()
        
        self.set_player_phase(voter.get_id(), UserPhase.WAITING)

        current_round: Round = self.rounds[-1]
        vote: Vote = Vote(voter_id, target_id, current_round.gift_id)
        self.votes[vote.get_id()] = vote
        current_round.votes.append(vote.get_id())

    def reset_round(self) -> None:
        current_round: Round = self.current_round()
        current_round.valid = False
        new_round: Round = Round(current_round.get_round_number()+1, gift_id=current_round.gift_id)

        self.rounds.append(new_round)

        for player_id in self.players.keys():
            self.set_player_phase(player_id, UserPhase.VOTING)

    def current_round(self) -> Round:
        return self.rounds[-1]
    
    def get_owner(self) -> list[str] | None:
        current_round: Round = self.current_round()
        
        owners: list[str] = []
        for vote_id in current_round.votes:
            vote: Vote = self.votes[vote_id]
            if vote.target_id == vote.voter_id:
                owners.append(vote.target_id)
        return owners
                
    def is_round_finished(self) -> bool:
        current_round: Round = self.current_round()
        return len(current_round.votes) == len(self.get_players())
    
    def is_round_invalid(self) -> bool:
        owners = self.get_owner()

        return len(owners) > 1 or (self.is_round_finished() and len(owners) == 0)

    
    def get_players(self) -> list[User]:
        return [player for player in self.players.values() if not player.is_host]
    
    def get_unassigned_gifts(self) -> list[Gift]:
        return [gift for gift in self.gifts.values() if not gift.assigned]

    def to_json(self) -> str:
        return json.dumps({
            "id": self.id,
            "host_id": self.host_id,
            "random": self.random,
            "self_vote": self.self_vote,
            "phase": self.phase,
            "rounds": [round.to_json() for round in self.rounds],
            "votes": {id: vote.to_json() for (id, vote) in self.votes.items()},
            "players": {id: player.to_json() for (id, player) in self.players.items()},
            "gifts": {id: gifts.to_json() for (id, gifts) in self.gifts.items()}
        })
    
    

    # Util
    def set_player_phase(self, player_id: string, phase: UserPhase):
        self.players[player_id].phase = phase