# Event Log

Each player sees the last 10 events. Events are appended newest-first.

## Event Shape
- `year`: integer
- `message`: string
- `type`: `info` | `warn` | `error` | `error blink`

## Notes
- Event messages are plain strings created by the server. There is no structured event taxonomy in the current build.
- Chat messages are separate from the event log and carry `{ from, text, year }`.
