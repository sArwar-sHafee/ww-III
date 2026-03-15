# Component: Building System

## Responsibility
Build queues, completion, and building effects on production and capacity.

## Inputs
- Build commands
- Current resources
- Research unlocks

## Outputs
- Updated building counts
- Updated capacities
- Events (`building_started`, `building_completed`)

## Rules
- All buildings take 1-3 years to complete (per `Readme.md`).
- Building costs are paid at build start.
- Only one of each type can be built per category unless specified.
- Factory grants +20% production to all resource buildings with assigned workers.
