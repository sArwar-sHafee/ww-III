# Component: UI System

## Responsibility
Render the text-only UI and react to state updates.

## Layout
- Top bar: year, population (current/max), net nutrition change, all resources with net deltas
- Upper-left: event log (last 10 events)
- Lower-left: chat
- Right sidebar: opponent intel
- Main tabs: Dashboard, Economy, Buildings, Military, Research, War Room

## Rules
- Numbers turn red when negative or at capacity; blinking when at 0 or over-capacity.
- UI updates on every server tick and on chat messages.
- All icons and emojis must follow `docs/ui/emoji-map.md`.
