# Component: Population System

## Responsibility
Handle nutrition consumption, starvation, and population growth.

## Rules
- Consumption: 0.25 nutrition per person per year, applied every tick.
- Starvation: at year end, if nutrition is 0, population drops.
- Starvation loss: if population > 10, lose `ceil(population * 0.2)`, otherwise lose up to 2.
- Growth: at year end, if population < populationMax, grow by `max(1, floor(population * 0.1))`.
- Shelter increases populationMax by +5 per completed building.
