# Component: Game Loop

## Responsibility
Own the 1-second tick, gather player actions, and run the resolution pipeline.

## Inputs
- Timer events every 1 second
- Action queue from players (`build`, `train`, `research`, `trade`, `set_auto_trade`, `cancel_auto_trade`, `scout`, `missile`, `assault`, `nuclear_strike`, `chat`, `cancel_pending`, `set_defence_assignment`)

## Outputs
- Updated room state
- Event log messages
- SSE state updates

## Key Rules
- The tick order is fixed (see `docs/data/tick-order.md`).
- Actions submitted during a year resolve simultaneously at year end.
- Invalid actions are rejected immediately with an error message.
- The match begins after a 10-second countdown when the second player joins.
