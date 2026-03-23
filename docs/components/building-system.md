# Component: Building System

## Responsibility
Queue structures, complete them over time, and apply capacity or production effects.

## Core Rules
- Build costs are paid immediately.
- Build completion increments the owned count.
- `Shelter` increases population cap by +5 on completion.
- Some buildings require research.
- `Missile Silo` is research, not a building.

## Building Data
All build times are in months. One month is 3 ticks / 3 seconds. Production and upkeep values are per year and are scaled each tick.

| Id | Name | Category | Cost | Build Time | Production | Capacity | Upkeep | Battle Point | Requires |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `farm` | Farm | economy | lumber 10, steel 7 | 2 | nutrition +1 | nutrition +200 | - | - | - |
| `lumber_camp` | Lumber Camp | economy | lumber 7, steel 4 | 1 | lumber +2 | lumber +150 | - | - | - |
| `steel_mill` | Steel Mill | economy | lumber 15, steel 7 | 2 | steel +2 | steel +100 | - | - | - |
| `copper_mine` | Copper Mine | economy | lumber 20, steel 12 | 2 | copper +2 | copper +120 | - | - | - |
| `alloy_quarry` | Alloy Quarry | economy | lumber 25, steel 12 | 2 | alloy +3 | alloy +80 | - | - | - |
| `oil_rig` | Oil Rig | economy | steel 30, alloy 20, concrete 4 | 3 | oil +3 | oil +100 | - | - | `electricity` |
| `magnet_extractor` | Magnet Extractor | economy | steel 35, alloy 15, oil 10, copper 5 | 3 | magnet +3 | magnet +60 | - | - | `advanced_mining` |
| `power_plant` | Power Plant | economy | steel 25, oil 10, copper 12, concrete 10 | 2 | electricity +3 | electricity +80 | - | - | `electricity` |
| `glassworks` | Glassworks | economy | lumber 25, steel 10, copper 4 | 2 | glass +2 | glass +120 | - | - | `industrial_furnaces` |
| `polymer_plant` | Polymer Plant | economy | steel 20, oil 15, electricity 3, copper 4 | 2 | polymer +2 | polymer +120 | - | - | `polymer` |
| `concrete_plant` | Concrete Plant | economy | lumber 20, steel 10, electricity 3 | 2 | concrete +3 | concrete +180 | - | - | `industrial_materials` |
| `silicon_refinery` | Silicon Refinery | economy | steel 30, alloy 10, copper 12, electricity 5 | 3 | silicon +2 | silicon +80 | - | - | `advanced_mining` |
| `uranium_mine` | Uranium Mine | economy | steel 50, alloy 30, concrete 30, magnet 10, copper 15, glass 10, electricity 20 | 3 | uranium +1 | uranium +60 | - | - | `advanced_mining` |
| `shelter` | Shelter | support | lumber 20, steel 7, concrete 3 | 1 | - | - | - | - | - |
| `barracks` | Military Camp | support | lumber 25, steel 15, concrete 10 | 2 | - | - | - | - | - |
| `factory` | Factory | support | steel 25, alloy 20, oil 10, copper 15, concrete 8 | 3 | - | - | - | - | `electricity` |
| `radar_station` | Radar Station | support | steel 20, alloy 12, magnet 10, copper 12, glass 8 | 2 | - | - | - | - | `advanced_scouting` |
| `dry_dock` | Dry Dock | support | lumber 45, steel 35, concrete 25, polymer 10 | 3 | - | - | - | - | - |
| `airfield` | Airfield | support | steel 55, alloy 30, concrete 40, glass 15, copper 18 | 3 | - | - | - | - | - |
