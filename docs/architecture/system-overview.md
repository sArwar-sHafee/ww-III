# System Overview

## Game Summary
`ww-III` is a two-player, server-authoritative, real-time, tick-based war game. The server advances time every 1 second. A full game year is 48 seconds, divided into 12 months of 3 seconds each.

## High-Level Architecture
- Server: Node.js HTTP server, authoritative state and tick resolution.
- Client: text-only web UI that renders server state and submits player actions.
- Networking: HTTP for commands + SSE for live state streaming, with polling fallback.

## Core Concepts
- Deterministic resolution. There is no randomness in combat or damage rolls.
- A room hosts up to two players. The game starts after a 10-second countdown when the second player joins.
- Actions are queued during a year and resolve at year end.
- The tick order is fixed. See `docs/data/tick-order.md`.

## Key Systems
- Economy: resources, production, capacity, upkeep, trade.
- Population: nutrition consumption, starvation, growth, housing cap.
- Buildings: construction queues, completion, capacity, and production.
- Research: sequential techs with prerequisites and timing.
- Combat: missiles and assault resolution across target buckets.
- Scouting: intel windows that increase strike efficiency.
- UI: live tabs, event log, chat, and opponent intel.
