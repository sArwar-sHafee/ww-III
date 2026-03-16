# ww-III: Real-Time Resource Warfare (Node.js Build)

This repository now includes a working Node.js implementation of the 2-player text-based strategy game described in `docs/`.

## Stack
- **Node.js HTTP server** (no external packages required)
- **Server-Sent Events (SSE)** for real-time state updates and chat/event sync
- **Vanilla HTML/CSS/JS** client UI (text + emoji focused)

## What is implemented
- 4-digit room creation and join flow
- 10-second countdown when second player joins
- Server-authoritative 30-second tick loop
- Tick-order pipeline based on docs:
  1. Population consumption
  2. Building production (+tech modifiers)
  3. Unit upkeep
  4. Combat/scout queued action resolution
  5. Resource apply + clamp/capacity
  6. Population growth/starvation
  7. Year advance + broadcast
- Buildings, units, research, war-room action queue
- Event log (last 10)
- Chat (`/surrender` supported)
- Opponent intel visible only while scout intel is active
- Victory checks (population wipe, resource collapse, surrender)

## Run locally
```bash
npm start
```
Then open:
- `http://localhost:3000`

Open two browser windows to test both players.

## Vercel notes
This build is Node.js-first and runs as a long-lived process.
For Vercel deployment, you'll likely want to adapt room state + realtime transport for serverless constraints (e.g., durable store + hosted websocket/SSE broker).
