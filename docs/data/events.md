# Event Log

Each player sees the last 10 events. Events are appended in order and displayed newest-to-oldest.

## Event Types
- `building_started`
- `building_completed`
- `unit_trained`
- `research_started`
- `research_completed`
- `missile_launched`
- `missile_intercepted`
- `missile_hit`
- `ground_assault_launched`
- `ground_assault_resolved`
- `scout_launched`
- `scout_detected`
- `population_starvation`
- `population_growth`

## Payload Fields (suggested)
- `type`
- `year`
- `message`
- `details` (optional structured data)
