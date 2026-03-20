# Component: Unit System

## Responsibility
Train units, apply upkeep, and expose combat stats for war resolution.

## Core Rules
- Units are trained instantly after paying costs.
- Some units require specific buildings and research.
- Missile units are consumed on launch.
- Defence-assignable units can be assigned to buckets in the Management tab.

## Unit Data
All upkeep values are per year and are scaled each tick.

| Id | Name | Section | Cost | Upkeep | Attack | Defense | Battle Point | Requires | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `infantry` | Infantry | military | nutrition 6, steel 4 | nutrition 0.15 | 10 | 5 | 10 | `barracks` | assault |
| `special_force` | Special Force | military | nutrition 8, steel 8, electricity 2, polymer 2 | nutrition 0.25, electricity 0.1 | 22 | 14 | 22 | `barracks`, `advanced_scouting` | assault |
| `tank` | Tank | military | steel 12, oil 8, copper 4 | oil 0.1, steel 0.05 | 25 | 12 | 28 | `barracks`, `tanks` | assault |
| `war_ship` | War Ship | military | steel 50, alloy 30, oil 20, concrete 8 | oil 0.15, electricity 0.05 | 50 | 25 | 52 | `dry_dock`, `naval_warfare` | assault |
| `submarine` | Submarine | military | steel 60, alloy 35, oil 25, copper 10 | oil 0.2, electricity 0.08 | 80 | 40 | 78 | `dry_dock`, `naval_warfare` | assault |
| `fighter_zed` | Fighter Zed | military | alloy 40, oil 20, silicon 10, copper 8, glass 6 | oil 0.15, electricity 0.1 | 40 | 20 | 42 | `airfield`, `aerial_warfare` | assault |
| `attack_helicopter` | Attack Helicopter | military | steel 20, alloy 25, oil 15, polymer 6 | oil 0.12, polymer 0.05 | 60 | 30 | 58 | `airfield`, `aerial_warfare` | assault |
| `combat_drone` | Combat Drone | military | alloy 15, electricity 10, silicon 8, copper 6 | electricity 0.15, oil 0.05 | 35 | 18 | 32 | `airfield`, `advanced_scouting` | assault |
| `ballistic_missile` | Ballistic Missile | military | steel 20, alloy 20, oil 12, copper 8, uranium 3 | - | 160 | - | 160 | `missile_silo` | missile |
| `cruise_missile` | Cruise Missile | military | steel 14, alloy 12, oil 10, copper 4, polymer 5 | - | 110 | - | 110 | `missile_silo` | missile |
| `scout_drone` | Scout Drone | military | oil 5, electricity 3, copper 2, glass 2 | electricity 0.08 | - | - | - | `radar_station` | utility |
| `anti_tank_squad` | Anti-Tank Squad | defence | nutrition 10, steel 12, polymer 6 | nutrition 0.15 | - | 18 | 12 | `barracks`, `tanks` | defence-assignable |
| `naval_strike_missile` | Naval Strike Missile | defence | steel 30, alloy 24, oil 16, copper 8 | - | - | 45 | 30 | `dry_dock`, `guided_missiles` | defence-assignable |
| `air_defence_gun` | Air Defence Gun | defence | steel 26, alloy 14, electricity 10, copper 10 | electricity 0.08, copper 0.05 | - | 28 | 19 | `airfield`, `guided_missiles` | defence-assignable |
| `border_guard` | Border Guard | defence | nutrition 10, polymer 6 | nutrition 0.15 | - | 12 | 8 | `barracks` | defence-assignable |
