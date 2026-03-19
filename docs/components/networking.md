# Component: Networking

## Responsibility
Manage rooms, player join/leave, and state updates via Socket.io.

## Messages (suggested)
- `room:create`, `room:join`, `room:ready`
- `action:build`, `action:train`, `action:research`, `action:trade`, `action:set_auto_trade`, `action:cancel_auto_trade`
- `action:scout`, `action:missile`, `action:assault`
- `state:update`, `event:log`, `chat:message`

## Rules
- Server is authoritative; client sends intents only.
- Disconnecting does not end the game.
