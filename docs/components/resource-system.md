# Component: Resource System

## Responsibility
Track resource amounts, apply production and consumption, enforce storage capacity, and expose net deltas.

## Resources
`nutrition`, `lumber`, `steel`, `copper`, `alloy`, `oil`, `magnet`, `electricity`, `glass`, `polymer`, `concrete`, `silicon`, `uranium`

## Rules
- Resource deltas are applied every tick and clamped to `[0, capacity]`.
- Capacity defaults to 999999 per resource and is increased by economy buildings.
- UI `net` values are yearly deltas computed from the current tick's net change.
- Trade updates resources either immediately (auto) or after the trade delay (manual).
