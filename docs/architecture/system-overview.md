# System Overview

## Game Summary
`ww-III` is a two-player, server-authoritative, real-time, tick-based war game. Each year is exactly 30 seconds of real time. Both players' actions resolve simultaneously at tick end.

## High-Level Architecture
- Server: single source of truth, runs all ticks, production, combat, and resolution.
- Client: renders text-only UI and sends player intents.
- Networking: Socket.io rooms keyed by 4-digit code.

## Core Concepts
- Deterministic resolution. Randomness only in missile damage range and ground assault loot amount.
- A room always has exactly two players.
- The tick applies updates in a fixed order (see `docs/data/tick-order.md`).

## Key Systems
- Economy: resources, production, capacity, upkeep.
- Population: consumption, growth, starvation.
- Buildings: queues, completion, storage capacity.
- Research: sequential tech unlocks.
- Combat: missiles and ground assaults.
- Scouting: visibility and intel delays.
- UI: real-time text panels and tabs.
