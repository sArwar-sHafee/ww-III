# Component: Research System

## Responsibility
Unlock new buildings, units, and war actions through sequential techs.

## Core Rules
- Only one active research at a time per player.
- Research costs are paid immediately on start.
- A successful Research Center hit destroys the active research progress, so the player must pay and start it from zero again later.
- If there is active research, the hit also destroys 1 completed research; otherwise it destroys 2 completed researches.
- Successful Research Center hits block starting any new research for 2 years.
- Completed researches are removed from the end of the completed list first (most recently finished research is lost first).
- The system uses month-based durations even though the field name is `years` in code.

## Research Data
Duration is in months.

| Id | Name | Cost | Duration | Prerequisite | Min Year |
| --- | --- | --- | --- | --- | --- |
| `basic_tools` | Basic Tools | alloy 15, lumber 10 | 9 | - | 3 |
| `electricity` | Electricity Research | alloy 25, magnet 5, copper 12 | 12 | `basic_tools` | - |
| `guided_missiles` | Guided Missiles | alloy 30, magnet 10, copper 8 | 12 | `basic_tools` | - |
| `missile_silo` | Missile Silo | alloy 45, magnet 20, steel 10, concrete 20, uranium 8 | 12 | `guided_missiles` | - |
| `industrial_furnaces` | Industrial Furnaces | alloy 20, steel 5, copper 6 | 9 | `basic_tools` | - |
| `advanced_mining` | Advanced Mining | alloy 35, magnet 15, copper 12 | 12 | `electricity` | - |
| `tanks` | Tank Technology | alloy 40, magnet 20, oil 10, copper 10 | 12 | `guided_missiles` | - |
| `naval_warfare` | Naval Warfare | alloy 40, magnet 20, concrete 10 | 12 | `basic_tools` | - |
| `aerial_warfare` | Aerial Warfare | alloy 50, silicon 20, copper 15, glass 10 | 12 | `electricity` | - |
| `advanced_scouting` | Advanced Scouting | alloy 25, magnet 10, copper 10, silicon 8 | 9 | `industrial_furnaces` | - |
| `polymer` | Polymer Research | alloy 30, oil 10, copper 5 | 12 | `electricity` | - |
| `industrial_materials` | Industrial Materials Research | alloy 20, steel 5, electricity 5, glass 10, concrete 10 | 9 | `industrial_furnaces` | - |
| `nuclear_technology` | Nuclear Technology | alloy 100, magnet 50, electricity 30, uranium 20, copper 15 | 12 | `advanced_mining` | - |
