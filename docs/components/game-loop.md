# Component: Game Loop

## Responsibility
Own the 30-second tick, gather player actions, and run the resolution pipeline.

## Inputs
- Timer events (every 30 seconds)
- Action queue from players (`build`, `train`, `research`, `scout`, `launch_missile`, `assault`)

## Outputs
- Updated room state
- Event log messages
- WebSocket broadcasts

## Key Rules
- The tick order is fixed (see `docs/data/tick-order.md`).
- All actions submitted during a year resolve simultaneously at tick end.
- No mid-tick partial updates are visible to players.

## Failure Handling
- If a player disconnects, the game continues.
- Invalid actions are rejected immediately with a reason string.
