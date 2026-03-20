# Production

Production is computed every tick and applied as `1/60` of yearly values.

## Base Production (per year, per building)
- Farm: nutrition +4
- Lumber Camp: lumber +3
- Steel Mill: steel +2
- Copper Mine: copper +2
- Alloy Quarry: alloy +1
- Oil Rig: oil +3
- Magnet Extractor: magnet +1
- Power Plant: electricity +3
- Glassworks: glass +2
- Polymer Plant: polymer +2
- Concrete Plant: concrete +3
- Silicon Refinery: silicon +1.5
- Uranium Mine: uranium +0.8

## Production Modifiers
- Basic Tools research: +20% to building production.
- Factory (if at least one): +20% to building production.
- Modifiers stack multiplicatively.

## Upkeep (per year)
- Power Plant: oil -0.3 per building.
- Unit upkeep is defined in `docs/components/unit-system.md`.
