# Game Documentation: `ww-III`

## Overview
`ww-III` is a text-based 2-player real-time strategy game. One player creates a 4-digit room code, the other joins, and both sides manage resources, supports, military forces, defences, research, trade, and queued war actions.

The current implementation is a server-authoritative Node.js prototype with SSE live updates, session recovery, chat, yearly resolution, and text-only UI panels.

## Core Loop
- One game year lasts 60 real seconds.
- Buildings, resource deltas, upkeep, queued war actions, population changes, and treasury income resolve on the server.
- Both players start with the same boosted test baseline in the current build.

## Economy And Treasury
- Resources: nutrition, lumber, steel, alloy, oil, magnet, electricity, glass, polymer, concrete, silicon.
- Credits are the treasury currency.
- At the end of each year, the player gains credits equal to current population.
  - Example: population `20` gives `+20` credits next year.
- The `Trade` tab lets the player buy or sell any resource.
- Exchange rate is `1 credit` per unit of resource.
- Every trade also pays a flat `1 credit` fee.
  - Buying `5` steel costs `6` credits.
  - Selling `5` steel returns `4` credits.

## Main Tabs
1. Dashboard
2. Economy
3. Trade
4. Supports
5. Military
6. Defences
7. Research
8. War Room

## Renamed Terms
- `Buildings` tab -> `Supports`
- `House` -> `Shelter`
- `Wall` -> `Land Mine`
- `Soldier` -> `Infantry`
- `Plastics` -> `Polymer`
- `Plastics Plant` -> `Polymer Plant`

## Structures

### Economy
- Farm
- Lumber Camp
- Steel Mill
- Alloy Quarry
- Oil Rig
- Magnet Extractor
- Power Plant
- Glassworks
- Polymer Plant
- Concrete Plant
- Silicon Refinery

### Supports
- Shelter: +5 population capacity
- Barracks
- Factory
- Radar Station
- Dry Dock
- Airfield

### Defensive Structures
- Anti-Missile Battery
- Land Mine

## Units

### Military
- Infantry
- Special Force
- Tank
- War Ship
- Submarine
- Fighter Zed
- Attack Helicopter
- Combat Drone
- Ballistic Missile
- Cruise Missile
- Scout Drone

### Defence
- Anti-Tank Squad
- Naval Strike Missile
- Air Defence Gun

## Research
- Basic Tools
- Electricity
- Guided Missiles
- Missile Silo
- Industrial Furnaces
- Advanced Mining
- Tank Technology
- Naval Warfare
- Aerial Warfare
- Advanced Scouting
- Polymer
- Industrial Materials
- Nuclear Technology

`Missile Silo` now lives in the Research tab and unlocks missile operations rather than existing as a buildable structure.

## War Room
- Scout Drone can reveal opponent buildings and approximate resources for 2 years.
- Missile and assault attacks on a bucket use 100% impact with active scout intel on that bucket, otherwise 80%.
- Missiles are launched from owned missile stock after `Missile Silo` research is completed.
- Assaults can commit all assault-capable military units.
- Assault strength uses each unit's configured attack value.
- Defence strength uses defending units' defence values plus a Land Mine bonus.
- Anti-Missile Batteries can intercept incoming missiles.

## Technical Notes
- Server file: [server.js](/home/sarwarshafee/Downloads/my_personal_project/ww-III/server.js)
- Client file: [public/app.js](/home/sarwarshafee/Downloads/my_personal_project/ww-III/public/app.js)
- Transport: SSE plus polling fallback
- Runtime: plain Node.js HTTP server
