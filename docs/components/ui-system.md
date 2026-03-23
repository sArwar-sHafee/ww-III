# Component: UI System

## Responsibility
Render the text-only UI from server state and submit player actions.

## Layout
- Left: event log and chat
- Center: tabbed command area
- Right: quick status and resource summaries

## Main Tabs
- Economy
- Construction
- Trade
- Research
- Defence
- Military
- Management (defence assignments)
- War Room
- Opponent Intel
- Help

## UI Rules
- Credits and population are always visible.
- Manual trade orders settle after a 3-month delay (9 seconds at 3 seconds per month).
- Auto trades execute once per year at year end.
- War Room queues actions that resolve at year end.
- Opponent Intel can be forced to the foreground for 15 seconds after a strike.
