# Component: Scouting System

## Responsibility
Provide temporary opponent intel and influence strike efficiency.

## Rules
- Requires a Scout Drone unit (trained at a Radar Station).
- A scout can be queued once per year. Cooldown: `currentYear + 1`.
- Intel lasts 2 years for the chosen bucket.
- Buckets: `economy`, `buildings`, `research_center`.
- Active intel raises strike efficiency to 100%. Without intel, strikes apply at 80%.
- The target always receives a scout-detected event.

## Intel Content
- Economy: exact counts of economy buildings and floored resource totals.
- Buildings: exact counts of support buildings.
- Research Center: active research status, lock status, and completed techs with disabled state.
- Assigned defenders for that bucket are shown if any.
