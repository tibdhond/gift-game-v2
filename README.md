# Gift Game V2

A rewrite of [Gift Game](https://github.com/tibdhond/gift_game). 

A reverse secret santa game. Everyone buys their own gift. The gift are deposited in a pool and opened one at a time by a random person. Everyone then tries to guess who they think the gift belongs to. Only when a majority agrees on a target, does this person reveal whether the guess was correct or not. The game continues until all gifts are correctly assigned to their recipients.

Gift game V2 is a more stable version of the game than the original version. It also was designed with persistent game state presevation in mind from the start instead of it being added as an afterthought.

Written with a Python/Flask backend and a Typescript/Angular frontend.