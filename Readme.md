# Game Documentation: `ww-III`

## Overview
`ww-III` is a text-based 2-player real-time strategy game. One player creates a 4-digit room code, the other joins, and both sides manage resources, supports, military forces, defences, research, trade, and queued war actions.

The current implementation is a server-authoritative Node.js prototype with SSE live updates, session recovery, chat, yearly resolution, and text-only UI panels.

## Core Loop
- 1 tick = 1 second.
- 48 ticks = 1 year.
- 3 ticks = 1 month.
- Buildings, resource deltas, upkeep, queued war actions, population changes, and treasury income resolve on the server.

## Economy And Treasury
- Resources: nutrition, lumber, steel, copper, alloy, oil, magnet, electricity, glass, polymer, concrete, silicon, uranium.
- Credits are the treasury currency.
- At the end of each year, the player gains credits equal to current population.
- Manual trades have a 3-month delivery delay (9 seconds total).
- Auto trades execute once per year at year end.
- Trade prices vary by resource. Manual trade fee is 20% of trade value, auto trade fee is 10% of trade value, and auto trade cancellation costs 20 credits.

## Main Tabs
1. Economy
2. Construction
3. Trade
4. Research
5. Defence
6. Military
7. Management
8. War Room
9. Opponent Intel
10. Help

## Key Rules
- Missile and assault impacts are scaled to 100% with active scout intel, otherwise 80%.
- Nuclear strikes are available after `Nuclear Technology` research and end the match immediately.
- War actions resolve at year end, not immediately.

## Technical Notes
- Server file: `server.js`
- Client file: `public/app.js`
- Transport: SSE plus polling fallback
- Runtime: plain Node.js HTTP server

See `docs/README.md` for full mechanics and data tables.
