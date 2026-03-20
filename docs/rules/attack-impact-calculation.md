# Attack Impact Calculation

## Assault Success
- Assaults resolve for up to 3 defender rounds.
- Defenders fire using their combat profiles.
- The assault succeeds if at least one attacking unit survives.
- Defender battle points do not block an assault by direct score comparison.

## Survivor Score
- Post-battle impact is based on surviving attacker battle points only.
- `remainingCombatScore = sum(survivingUnits * unitBattlePoint)`
- `survivorScore = ceil(remainingCombatScore / 120)`
- Minimum `survivorScore` is `1` for any successful assault.

## Scout Modifier
- Active scout intel on the same bucket applies `100%` impact.
- Without active scout intel, impact is scaled to `80%`.
- Integer impact values use floor scaling with a minimum of `1` when the base value is positive.

## Economy Impact
- `buildingLosses = min(4, survivorScore)`
- `lootPct = min(0.18, 0.06 + survivorScore * 0.02)`
- Economy loot transfers `lootPct` of every positive resource from defender to attacker.
- Economy building destruction follows this exact priority:
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

## Buildings Impact
- `buildingLosses = min(4, max(1, survivorScore))`
- `populationLoss = min(8, survivorScore * 2)`
- Buildings bucket removes the most numerous support building first.
- Ties are resolved by building id alphabetical order.

## Research Center Impact
- A successful hit cancels the active research if one exists.
- The canceled tech is disabled for `ceil(fullResearchDurationMonths / 2)`.
- Completed techs are never disabled by Research Center hits.
- New research is blocked for 2 years after a successful Research Center hit.

## Extra Population Casualties
- Every successful missile or assault also applies extra population casualties.
- Severity score is:
- `(buildingLosses * 2) + (resourcePct * 10) + (lootPct * 10) + populationLoss + (delayMonths / 3) + (disableYears * 2)`
- Extra casualties are `ceil(severityScore)`, capped between `1` and `10`.

## Defender Depletion
- Defenders can be destroyed during assaults.
- A defender asset is destroyed after fully spending its 3-round kill capacity during the invasion.
- Defender losses reduce both the assigned defence roster and the owned stock.
