# Component: Networking

## Responsibility
Manage rooms, player join/leave, and state updates over HTTP + SSE.

## Endpoints
- `POST /api/room/create` `{ name }` -> `{ roomId, playerId, reconnectToken }`
- `POST /api/room/join` `{ roomId, name }` -> `{ roomId, playerId, reconnectToken }`
- `POST /api/room/reconnect` `{ roomId, reconnectToken }` -> `{ roomId, playerId, reconnectToken }`
- `GET /api/state?roomId=...&playerId=...` -> player-scoped state
- `GET /api/stream?roomId=...&playerId=...` -> SSE stream of state updates
- `POST /api/action` `{ roomId, playerId, type, payload }`
- `GET /api/meta` -> static definitions (buildings, units, research, etc.)
- `GET /healthz` -> `ok`

## Action Types
`build`, `train`, `research`, `trade`, `set_auto_trade`, `cancel_auto_trade`, `scout`, `missile`, `assault`, `nuclear_strike`, `chat`, `cancel_pending`, `set_defence_assignment`

## Notes
- Server is authoritative; client sends intents only.
- The client prefers SSE and falls back to periodic polling if needed.
