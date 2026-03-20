# State Model

The server is authoritative. Clients only receive a player-scoped view of the room state.

## Room State (Client View)
- `roomId`: 4-digit string
- `ticks`: integer tick counter from match start
- `year`: integer
- `month`: integer
- `phase`: `waiting` | `countdown` | `active` | `finished`
- `warCondition`: `{ code, label, description }`
- `tickEndsAt`: server timestamp (next tick)
- `yearEndsAt`: server timestamp (end of current year)
- `winner`: playerId or `null`
- `you`: PlayerState (full local view)
- `opponent`: `{ name }`

## PlayerState (Client View)
- `playerId`: string
- `name`: string
- `population`: int
- `populationMax`: int
- `credits`: int
- `resources`: map of `resource -> number`
- `buildings`: map of `buildingId -> count`
- `buildingQueues`: list of `{ id, ticksRemaining }`
- `units`: map of `unitId -> count`
- `research.completed`: list of tech ids
- `research.active`: `{ id, ticksRemaining } | null`
- `research.disabledUntil`: map of `techId -> year`
- `research.disabledUntilTick`: map of `techId -> tick`
- `eventLog`: last 10 events
- `chat`: recent chat messages
- `pending`: queued war-room actions for the current year
- `tradeOrders`: list of delayed trade orders `{ id, resource, mode, amount, ticksRemaining }`
- `autoTrades`: map of `resource -> { mode, amount } | null`
- `scoutCooldownUntil`: year integer
- `scoutIntelUntil`: map of `bucket -> year`
- `opponentIntelLog`: list of intel entries
- `defenceAssignments`: map of `bucket -> { id -> count }`
- `forcedView`: `{ tab, lockedUntil, reason } | null`
- `researchLockUntil`: year integer
- `zeroYears`: consecutive years with all resources at 0
- `net`: map of `resource -> yearlyDelta`

## Server-Only Fields (Not Sent to Client)
- `reconnectToken`
- `sse` connection handle
- `disconnected` flag
- `playerOrder` (room ordering)

## Resource Keys
`nutrition`, `lumber`, `steel`, `copper`, `alloy`, `oil`, `magnet`, `electricity`, `glass`, `polymer`, `concrete`, `silicon`, `uranium`

## Target Buckets
`economy`, `buildings`, `research_center`

## Starting State
- Year: 0
- Month: 1
- Population: 10
- Population max: 10
- Credits: 0
- Resources: nutrition 200, lumber 60, steel 40, copper 30, all others 0
- Buildings: farm 1, lumber_camp 1, steel_mill 1, copper_mine 1, shelter 2, all others 0
- Units: all 0
- Research: none
