# Component: Scouting System

## Responsibility
Provide temporary opponent intel and influence strike efficiency.

## Rules
- Requires a Scout Drone unit (trained at a Radar Station).
- A scout can be queued once per year. Cooldown: `currentYear + 1`.
- Intel lasts 3 years for the chosen bucket.
- Buckets: `economy`, `buildings`, `research_center`.
- A completed scout grants 3 years of active intel for that same bucket.
- Any missile or assault queued after that scout on the same year-end resolution gets 100% impact.
- If an attack resolves before a scout on that bucket, it only gets the default 80% impact.
- Active intel raises strike efficiency to 100%. Without intel, strikes apply at 80%.
- The target always receives a scout-detected event.

## Intel Content
- Economy: exact counts of economy buildings and floored resource totals.
- Buildings: exact counts of support buildings.
- Research Center: active research status, research lock status, completed techs, and any temporarily disabled research with remaining months.
- Assigned defenders for that bucket are shown if any.
