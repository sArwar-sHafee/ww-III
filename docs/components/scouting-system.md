# Component: Scouting System

## Responsibility
Provide temporary opponent intel with accuracy bounds and detection event.

## Inputs
- Scout launch command
- Target player state

## Outputs
- Scouting intel entries (expires after 2 years)
- Event log entries (both players)

## Rules
- Scout reveals exact buildings and approximate resource totals (±10%) for 2 years.
- The target receives a "Scout Detected" event.
