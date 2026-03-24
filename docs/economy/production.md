# Production

Production is computed every tick and applied as `1/36` of yearly values.

## Base Production (per year, per building)
- Farm: nutrition +5
- Lumber Camp: lumber +10
- Steel Mill: steel +10
- Copper Mine: copper +10
- Alloy Quarry: alloy +15
- Oil Rig: oil +15
- Magnet Extractor: magnet +15
- Power Plant: electricity +15
- Glassworks: glass +10
- Polymer Plant: polymer +10
- Concrete Plant: concrete +15
- Silicon Refinery: silicon +10
- Uranium Mine: uranium +5

## Production Modifiers
- Basic Tools research: +20% to building production.
- Factory (if at least one): +20% to building production.
- Modifiers stack multiplicatively.

## Upkeep (per year)
- Economy buildings currently have no upkeep.
- Unit upkeep is defined in `docs/components/unit-system.md`.
