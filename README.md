# Gift Game V2

A rewrite of [Gift Game](https://github.com/tibdhond/gift_game). 

A reverse secret santa game. Everyone buys their own gift. The gift are deposited in a pool and opened one at a time by a random person. Everyone then tries to guess who they think the gift belongs to. Only when a majority agrees on a target, does this person reveal whether the guess was correct or not. The game continues until all gifts are correctly assigned to their recipients.

Gift game V2 is a more stable version of the game than the original version. It also was designed with persistent game state presevation in mind from the start instead of it being added as an afterthought.

Written with a Python/Flask backend and a Typescript/Angular frontend.


## Installation

### In the frontend folder
Run 
```npm install``` and 
```npm run build```

### In the backend folder
Run ```pip install -r requirements.txt```


## Running the app

### In the backend folder
Run ```python main.py``` 

## Testing / developing

There is currently no automated test suite. However, there are test files available for manual testing.

To use these files, instead of creating a new game room, use the name of the file instead of the 4 letter code that would normally be generated.
E.g. for TEST_MID, navigate to <ip>/host/TEST_MID/players.

If testing host functionality and accessing any of the files for the first time, you might need to request a token first.
You can do this by navigating to 

``<ip>/host/TEST_MID/token``

Firefox has some issues deleting cookies on mobile (which results in problems logging out). You can log out manually by navigating to: 

``<ip>/client/:game_id/logout``

The currently available test files cover most features and screens. Some features still require some manual editing of the game state/the test files (or regular play) to reach them.

### Overview of test files
* TEST_STARTING
    + Game has not yet started. Users are still registering.
    + Use to test the host 'players' screen (You can also you TEST_EARLY for this t.b.h.)
* TEST_EARLY
    + The game has started and is in the EARLY phase (gifts are still being opened)
    + Use to test 'round progress' screen (host), waiting screen (user), and voting screen (user)
* TEST_GIFT_OPENING
    + The game has started, but users cannot vote yet. One player is being requested to open a gift.
    + Use to test the 'round progress' screen (host) and gift opening screen (user)
* TEST_ROUND_END
    + A voting round has just ended. Every user has voted, but a new round has not started yet.
    + Use to test 'round results' screen (host), waiting screen (user)
* TEST_FINISHED
    + The game has finished. All gifts have been assigned to their owners.
    + Use to test 'final-results' (host) and 'personal-results' (user)

### Overview of missing test data for screens / features and how to test them
* Gift images
    + Start from TEST_GIFT_OPENING and follow regular game flow from there
    + Upload files to the static/gift_images/<game_id>/ and manually point the gifts images paths to them in the game state.

* Mid game (stage where users no longer open gifts and the game decides which gifts are getting voted on)
    + Currently no good way to get here. Would require a game with a number of rounds == number of players. This would also mean a lot of votes need to be generated.
    + Currently, the easient way to get to this stage is to start a new game with a low number of players and simply play the game.