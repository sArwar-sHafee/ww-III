# Production

Production is computed every tick and applied as `1/48` of yearly values.

## Base Production (per year, per building)
- Farm: nutrition +1
- Lumber Camp: lumber +2
- Steel Mill: steel +2
- Copper Mine: copper +2
- Alloy Quarry: alloy +3
- Oil Rig: oil +3
- Magnet Extractor: magnet +3
- Power Plant: electricity +3
- Glassworks: glass +2
- Polymer Plant: polymer +2
- Concrete Plant: concrete +3
- Silicon Refinery: silicon +2
- Uranium Mine: uranium +1

## Production Modifiers
- Basic Tools research: +20% to building production.
- Factory (if at least one): +20% to building production.
- Modifiers stack multiplicatively.

## Upkeep (per year)
- Economy buildings currently have no upkeep.
- Unit upkeep is defined in `docs/components/unit-system.md`.
