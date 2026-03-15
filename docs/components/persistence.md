# Component: Persistence

## Responsibility
Store room state while a match is active.

## Rules
- All state is kept server-side.
- If the server restarts, active rooms are lost unless persistence is added.
