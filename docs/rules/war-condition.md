# War Condition

`warCondition` is a derived room-level status computed from phase and player stability.

## Priority Order
1. `finished`: a winner exists.
2. `standby`: fewer than two players are in the room.
3. `mobilizing`: both players joined and the pre-match countdown is running.
4. `critical`: a player is close to collapse.
5. `active`: match is live and no critical state is detected.

## Critical State
A player is critical if either condition is true:
- Population is at or below 25% of population cap, with a minimum threshold of 10.
- The player has had zero resources for 3 consecutive years.
