# War Room Rules

## Buckets
All war actions target one of three buckets:
- `economy`
- `buildings`
- `research_center`

## Defence Assignments
- Defence-assignable assets can be assigned to exactly one bucket.
- Assigned defenders are used for missile interception and assault defence.
- Defence assignments are managed in the Management tab.

## Scouting
- Requires a Scout Drone.
- Cooldown: once per year.
- Intel lasts 2 years for the chosen bucket.
- Active intel grants 100% strike efficiency; without intel, impact is scaled to 80%.

## Missile Strikes
- Requires `Missile Silo` research and missile stock.
- Each missile consumes one unit.
- Interception uses assigned Anti-Missile Batteries.
- Impact scales with missile effectiveness after interception and with scout intel.

### Missile Payloads
| Missile | Economy Impact | Buildings Impact | Research Center Impact | Integrity |
| --- | --- | --- | --- | --- |
| Ballistic Missile | buildingLosses 4, resourcePct 0.15 | buildingLosses 3, populationLoss 6 | delayMonths 12, disableCount 2, disableYears 2 | 1.5 |
| Cruise Missile | buildingLosses 2, resourcePct 0.08 | buildingLosses 2, populationLoss 3 | delayMonths 6, disableCount 1, disableYears 1 | 1 |

## Assaults
- Only one assault can be queued per year.
- Any assault-capable unit may be committed.
- Defenders are the assets assigned to the target bucket.
- Defenders apply combat profiles; defenders do not take losses in the current build.
- Attacker wins if remaining attacker combat score exceeds defender score.

### Assault Impact (on attacker win)
- `economy`: buildingLosses up to 4, lootPct up to 0.18.
- `buildings`: buildingLosses up to 4, populationLoss up to 8.
- `research_center`: delayMonths scaled, disableCount up to 2, disableYears 1-2.
- All impacts are scaled by scout intel efficiency.
- Successful missile or assault impacts also inflict additional population loss based on impact severity (minimum 1).

## Nuclear Strike
- Available after completing `Nuclear Technology` research.
- Launching a nuclear strike ends the match immediately in favor of the launcher.
