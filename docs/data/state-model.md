# State Model

This is a minimal, explicit server state. You may extend it but do not remove fields without reason.

## Room State
- `roomId`: 4-digit string
- `year`: integer (starts at 0)
- `tickEndsAt`: server timestamp
- `players`: map of `playerId -> PlayerState`
- `pendingActions`: list of action payloads submitted during the current year
- `eventLog`: ring buffer (last 10 events per player)

## Player State
- `population`: int
- `populationMax`: int
- `resources`: map of resource -> int
- `buildings`: map of buildingId -> count
- `buildingQueues`: list of `{buildingId, yearsRemaining}`
- `units`: map of unitId -> count
- `research`:
  - `completed`: set of techIds
  - `active`: `{techId, yearsRemaining}` or null
- `scoutingIntel`: list of `{targetPlayerId, expiresAt, accuracyPct}`
- `stats`: optional analytics counters

## Resource Keys
`nutrition`, `lumber`, `steel`, `alloy`, `oil`, `magnet`, `electricity`, `glass`, `plastic`, `concrete`, `silicon`

## Building IDs
Use stable string IDs. Example set:
- `farm`, `lumber_camp`, `steel_mill`, `alloy_quarry`, `oil_rig`, `magnet_extractor`, `power_plant`
- `glassworks`, `plastics_plant`, `concrete_plant`, `silicon_refinery`
- `house`, `barracks`, `factory`, `radar_station`
- `missile_silo`, `anti_missile_battery`, `wall`

## Unit IDs
`soldier`, `tank`, `scout_drone`

## Notes
- All numeric values are integers unless explicitly defined as fractional during calculation, then floored.
