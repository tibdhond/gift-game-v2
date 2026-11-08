import json
import random
import os

file_path = os.path.abspath(os.path.join(os.getcwd(), 'backend', 'store', 'TEST_FINISHED.json'))

with open(file_path, 'r') as f:
    data = json.load(f)

players = [f'user-{i}' for i in range(1, 10)]
host_id = data['host_id']

# Map rounds to vote IDs
round_mapping = {}
current_vote_num = 1
for round_obj in data['rounds']:
    num_votes = len(round_obj['votes'])
    round_mapping[round_obj['_Round__id']] = [f"vote-{i}" for i in range(current_vote_num, current_vote_num + num_votes)]
    current_vote_num += num_votes

# Update rounds and build votes dictionary
new_votes = {}
# Keep existing votes that are correct (voter != target, and not a self-vote)
# Actually, it's easier to just rebuild the votes dictionary for all rounds to meet the requirements.
# The IDs are fixed (1-81).

# Pre-populate the votes dictionary for all IDs 1-81
for i in range(1, 82):
    new_votes[f'vote-{i}'] = {
        "_Vote__id": f"vote-{i}",
        "voter_id": "",
        "target_id": "",
        "gift_id": ""
    }

for round_obj in data['rounds']:
    r_id = round_obj['_Round__id']
    gift_id = round_obj['gift_id']
    vote_ids = round_mapping[r_id]
    
    # Determine the self-voter for this round
    self_voter = random.choice(players)
    
    # The self-vote
    self_vote_idx = random.randint(0, len(vote_ids) - 1)
    self_vote_id = vote_ids[self_vote_idx]
    new_votes[self_vote_id].update({
        "voter_id": self_voter,
        "target_id": self_voter,
        "gift_id": gift_id
    })
    
    # Other 8 votes
    other_vote_ids = [vid for vid in vote_ids if vid != self_vote_id]
    
    # We need 8 voters and 8 targets from the remaining players set
    # Actually, we can just use all players as voters (some might vote twice if we wanted, 
    # but let's try to use all 9 players). 
    # One is already used as self-voter.
    # So we have 8 players left to be voters for the 8 votes.
    remaining_players = [p for p in players if p != self_voter]
    
    # We need to assign these 8 voters to targets such that:
    # 1. No self-votes (target != voter)
    # 2. Multiple votes for the same person (at least one target gets >=2 votes)
    # 3. Not all for the same person
    # 4. None of these targets is the self_voter
    
    # Let's just pick 4 targets from the remaining_players
    # and give each 2 votes from 8 distinct voters (the 8 remaining_players).
    targets = random.sample(remaining_players, 4)
    voters = remaining_players # The 8 remaining players
    
    for i, vid in enumerate(other_vote_ids):
        # Each target in 'targets' gets 2 votes from 'voters'
        # Wait, there are 8 voters and 4 targets.
        # Target 0 gets voters [0, 1]
        # Target 1 gets voters [2, 3]
        # Target 2 gets voters [4, 5]
        # Target 3 gets voters [6, 7]
        target_idx = i // 2
        voter_idx = i % 2
        
        new_votes[vid].update({
            "voter_id": voters[voter_idx],
            "target_id": targets[target_idx],
            "gift_id": gift_id
        })

    round_obj['votes'] = vote_ids
    round_obj['valid'] = True
    round_obj['gift_id'] = gift_id

data['votes'] = new_votes

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)
print(f"Successfully updated {file_path}")
