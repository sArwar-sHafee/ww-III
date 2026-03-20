# Component: Combat System

## Responsibility
Resolve missile strikes and assaults at year end.

## Core Concepts
- Combat resolves only at year end.
- All combat is deterministic.
- Defenders are assigned per bucket (`economy`, `buildings`, `research_center`).
- Defence-assignable assets can only be assigned to one bucket at a time.

## Missile Resolution
1. Each missile consumes one unit from stock.
2. Compute intercept score from defender assignments.
3. If intercept score >= missile integrity, the missile is fully intercepted.
4. Otherwise, impact scales by `effectiveness = 1 - interceptScore / integrity`.
5. Apply bucket impact scaled by effectiveness and scout intel modifier.

## Assault Resolution
- Attacker commits assault-capable units.
- Defender roster is the bucket's assigned defence units and structures.
- Combat runs up to 3 rounds where defenders fire based on their combat profiles.
- Defenders are destroyed if they fully spend their 3-round kill capacity during the invasion.
- An assault succeeds if at least one attacking unit survives the defender fire.
- On win, the bucket receives scaled impact (see `docs/rules/war-room.md`).

## Combat Profiles
Some defence assets specify a `combatProfile` list of `[targetId, ratio]`:
- `ratio` is the number of target units removed per defender unit.
- The defender consumes its available count as it applies kills.
- Targets not listed are unaffected by that defender type.
