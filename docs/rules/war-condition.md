# War Condition

`warCondition` is a derived room-level status. It is not stored separately; the server calculates it from room phase, queued war actions, and collapse pressure.

## Priority Order
1. `finished`: a winner exists.
2. `standby`: fewer than two players are in the room.
3. `mobilizing`: both players joined and the pre-match countdown is running.
4. `critical`: at least one player has population at or below 25% of capacity (minimum threshold `10`) or has been fully resource-starved for 3 consecutive years.
5. `open_war`: at least one player queued a `missile` or `assault` action for the current year.
6. `escalation`: at least one player queued a `scout` action and no direct strike is queued.
7. `deterrence`: the match is active, but no war-room action is queued this year.

## Meaning
- `standby`: war cannot begin yet.
- `mobilizing`: both factions are present and preparing for the live match.
- `deterrence`: the match is live, but neither side has committed a war-room action.
- `escalation`: recon is active, but neither side has committed a direct strike.
- `open_war`: a missile strike or ground assault is committed for the current year.
- `critical`: one side is close to strategic collapse.
- `finished`: the match is over and a winner is known.
