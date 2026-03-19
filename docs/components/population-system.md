# Component: Population System

## Responsibility
Handle nutrition consumption, starvation, and population growth.

## Inputs
- Current population
- Current nutrition stock
- Housing capacity

## Outputs
- Updated population
- Event log entries

## Rules
- Consumption: 0.8 nutrition per person per year.
- If nutrition hits 0, 10% of the current population dies per year until nutrition is available.
- Surplus nutrition (more than 10 extra per person) gives +0.2 population growth per year, rounded down.
- Population is capped by Shelter capacity.
