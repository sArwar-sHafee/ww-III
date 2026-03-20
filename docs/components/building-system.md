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
All build times are in months. Production and upkeep values are per year and are scaled each tick.

| Id | Name | Category | Cost | Build Time | Production | Capacity | Upkeep | Battle Point | Requires |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `farm` | Farm | economy | lumber 15, steel 10 | 2 | nutrition +4 | nutrition +200 | - | - | - |
| `lumber_camp` | Lumber Camp | economy | lumber 10, steel 5 | 1 | lumber +3 | lumber +150 | - | - | - |
| `steel_mill` | Steel Mill | economy | lumber 20, steel 10 | 2 | steel +2 | steel +100 | - | - | - |
| `copper_mine` | Copper Mine | economy | lumber 20, steel 12 | 2 | copper +2 | copper +120 | - | - | - |
| `alloy_quarry` | Alloy Quarry | economy | lumber 25, steel 15 | 2 | alloy +1 | alloy +80 | - | - | - |
| `oil_rig` | Oil Rig | economy | steel 30, alloy 20, concrete 10 | 3 | oil +3 | oil +100 | - | - | `electricity` |
| `magnet_extractor` | Magnet Extractor | economy | steel 35, alloy 15, oil 10, copper 5 | 3 | magnet +1 | magnet +60 | - | - | `advanced_mining` |
| `power_plant` | Power Plant | economy | steel 25, oil 10, copper 12, concrete 10 | 2 | electricity +3 | electricity +80 | oil -0.3 | - | `electricity` |
| `glassworks` | Glassworks | economy | lumber 15, steel 10, copper 4 | 2 | glass +2 | glass +120 | - | - | `industrial_furnaces` |
| `polymer_plant` | Polymer Plant | economy | steel 10, oil 15, electricity 5, copper 4 | 2 | polymer +2 | polymer +120 | - | - | `polymer` |
| `concrete_plant` | Concrete Plant | economy | lumber 20, steel 10, electricity 5 | 2 | concrete +3 | concrete +180 | - | - | `industrial_materials` |
| `silicon_refinery` | Silicon Refinery | economy | steel 20, alloy 10, copper 12, electricity 5 | 3 | silicon +1.5 | silicon +80 | - | - | `advanced_mining` |
| `uranium_mine` | Uranium Mine | economy | steel 30, alloy 20, concrete 15, electricity 5 | 3 | uranium +0.8 | uranium +60 | - | - | `advanced_mining` |
| `shelter` | Shelter | support | lumber 20, steel 10, concrete 8 | 1 | - | - | - | - | - |
| `barracks` | Military Camp | support | lumber 25, steel 20, concrete 10 | 2 | - | - | - | - | - |
| `factory` | Factory | support | steel 35, alloy 20, oil 10, copper 15, concrete 10 | 3 | - | - | - | - | `electricity` |
| `radar_station` | Radar Station | support | steel 20, alloy 12, magnet 10, copper 12, glass 8 | 2 | - | - | - | - | `advanced_scouting` |
| `dry_dock` | Dry Dock | support | lumber 45, steel 35, concrete 25, polymer 10 | 3 | - | - | - | - | - |
| `airfield` | Airfield | support | steel 55, alloy 30, concrete 40, glass 15, copper 18 | 3 | - | - | - | - | - |
| `anti_missile_battery` | Anti-Missile Battery | military | steel 45, oil 20, magnet 18, copper 18 | 2 | - | - | - | 16 | `guided_missiles` |
| `land_mine` | Land Mine | military | lumber 60, steel 40, polymer 16 | 2 | - | - | - | 12 | - |
