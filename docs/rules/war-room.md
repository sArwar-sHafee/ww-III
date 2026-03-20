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
- Anti-Missile Batteries only defend against missiles. They do not stop infantry or other assault units by battle-point comparison.

### Missile Payloads
| Missile | Economy Impact | Buildings Impact | Research Center Impact | Integrity |
| --- | --- | --- | --- | --- |
| Ballistic Missile | buildingLosses 4, resourcePct 0.15 | buildingLosses 3, populationLoss 6 | destroy active research, destroy 1 completed research (or 2 completed if no active), block new research 2 years | 1.5 |
| Cruise Missile | buildingLosses 2, resourcePct 0.08 | buildingLosses 2, populationLoss 3 | destroy active research, destroy 1 completed research (or 2 completed if no active), block new research 2 years | 1 |

## Assaults
- Only one assault can be queued per year.
- Any assault-capable unit may be committed.
- Defenders are the assets assigned to the target bucket.
- Defenders apply combat profiles.
- Combat lasts up to 3 defender rounds.
- A defender asset is destroyed when it fully spends its 3-round kill capacity during the invasion.
- An assault succeeds if at least one attacking unit survives those rounds.
- Surviving attacker battle points determine post-battle impact.

### Assault Impact (on attacker win)
- `economy`: buildingLosses up to 4, lootPct up to 0.18 across every resource.
- `buildings`: buildingLosses up to 4, populationLoss up to 8.
- `research_center`: destroy active research, destroy 1 completed research (or 2 completed researches if there is no active one), and block new research for 2 years.
- All impacts are scaled by scout intel efficiency.
- Successful missile or assault impacts also inflict additional population loss based on impact severity (minimum 1).

## Defender Battle Points
- Anti-Missile Battery: 16
- Land Mine: 12
- Anti-Tank Squad: 12
- Naval Strike Missile: 30
- Air Defence Gun: 19
- Border Guard: 8

## Economy Destruction Priority
- `uranium_mine`
- `silicon_refinery`
- `concrete_plant`
- `polymer_plant`
- `glassworks`
- `power_plant`
- `magnet_extractor`
- `oil_rig`
- `alloy_quarry`
- `copper_mine`
- `steel_mill`
- `lumber_camp`
- `farm`

## Buildings Destruction Rule
- Buildings bucket removes the most numerous support building first.
- Ties are resolved by building id alphabetical order.

## Research Center Rule
- If there is active research, the hit destroys it immediately and the player must restart it from zero later.
- The same hit also destroys 1 completed research; if there is no active research, it destroys 2 completed researches instead.
- Destroyed completed researches are removed from the end of the completed list first.
- New research is blocked for 2 years after a successful Research Center hit.

## Nuclear Strike
- Available after completing `Nuclear Technology` research.
- Launching a nuclear strike ends the match immediately in favor of the launcher.
