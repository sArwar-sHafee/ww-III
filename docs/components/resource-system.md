# Component: Resource System

## Responsibility
Track resource amounts, apply production and consumption, enforce storage capacity and zero-flooring.

## Resources
`nutrition`, `lumber`, `steel`, `copper`, `alloy`, `oil`, `magnet`, `electricity`, `glass`, `polymer`, `concrete`, `silicon`, `uranium`

## Inputs
- Building production outputs
- Unit upkeep consumption
- Population consumption
- Combat loot
- Trade actions

## Outputs
- Updated resource totals
- Net change per resource for UI

## Rules
- Resources never drop below 0 after resolution; any negative net change clamps to 0.
- When capacity is full, excess production is discarded and UI should blink red.
- Capacity is derived from building capacity per resource building.
