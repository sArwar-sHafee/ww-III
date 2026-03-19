# State Model

## Room State
- `roomId`: 4-digit string
- `year`: integer
- `month`: integer
- `warCondition`: derived object `{code, label, description}`
- `tickEndsAt`: server timestamp
- `yearEndsAt`: server timestamp
- `players`: map of `playerId -> PlayerState`

## Player State
- `population`: int
- `populationMax`: int
- `credits`: int
- `resources`: map of resource -> number
- `buildings`: map of buildingId -> count
- `buildingQueues`: list of `{id, ticksRemaining}`
- `units`: map of unitId -> count
- `research.completed`: list of tech ids
- `research.active`: `{id, ticksRemaining}` or `null`
- `pending`: queued war-room actions for the current year
- `tradeOrders`: list of delayed trade orders `{id, resource, mode, amount, ticksRemaining}`
- `autoTrades`: map of `resource -> {mode, amount} | null`
- `eventLog`: last 10 events
- `chat`: recent chat messages

## Resource Keys
`nutrition`, `lumber`, `steel`, `copper`, `alloy`, `oil`, `magnet`, `electricity`, `glass`, `polymer`, `concrete`, `silicon`, `uranium`

## Building IDs
- `farm`, `lumber_camp`, `steel_mill`, `copper_mine`, `alloy_quarry`, `oil_rig`, `magnet_extractor`, `power_plant`
- `glassworks`, `polymer_plant`, `concrete_plant`, `silicon_refinery`, `uranium_mine`
- `shelter`, `barracks`, `factory`, `radar_station`, `dry_dock`, `airfield`
- `anti_missile_battery`, `land_mine`

## Unit IDs
- `infantry`, `special_force`, `tank`, `war_ship`, `submarine`
- `fighter_zed`, `attack_helicopter`, `combat_drone`
- `ballistic_missile`, `cruise_missile`, `scout_drone`
- `anti_tank_squad`, `naval_strike_missile`, `air_defence_gun`, `border_guard`

## Research IDs
`basic_tools`, `electricity`, `guided_missiles`, `missile_silo`, `industrial_furnaces`, `advanced_mining`, `tanks`, `advanced_scouting`, `polymer`, `industrial_materials`, `naval_warfare`, `aerial_warfare`, `nuclear_technology`
