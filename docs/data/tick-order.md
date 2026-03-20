# Tick Order

## Tick Timing
- 1 tick = 1 second.
- 5 ticks = 1 month.
- 60 ticks = 1 year.

## Per-Tick Order
1. Decrement building queues and complete any finished structures.
2. Decrement active research and complete if finished.
3. Decrement trade order timers and mark settled orders.
4. Compute resource deltas for this tick.
5. If this is year end, resolve queued war actions (scout, missile, assault).
6. Apply resource deltas and clamp to storage capacity.
7. Settle any trade orders whose timers reached zero.

## Year-End Order
8. Apply starvation or population growth.
9. Add treasury income equal to current population.
10. Resolve auto trades.
11. Update zero-resource streak and clear queued war actions.
12. Check victory conditions and broadcast state.

Determinism depends on keeping this order intact.
