# Component: Combat System

## Responsibility
Resolve missile strikes and ground assaults at tick end.

## Inputs
- Missile launch commands
- Ground assault commands
- Defender structures and units

## Outputs
- Updated buildings and units
- Resource theft
- Event log messages

## Rules
- Missiles require a silo and use per-missile costs.
- Anti-missile batteries provide interception chance per battery.
- Ground assault strength calculations follow `Readme.md`.
- All combat resolves at tick end.
