# Tick Order

Each year (30 seconds), the server resolves in this strict order:
1. Population consumes nutrition (0.8 per person).
2. Buildings produce resources (including worker bonuses).
3. Units consume upkeep.
4. Resolve missiles and ground assaults.
5. Apply all resource deltas and clamp to zero where needed.
6. Resolve population growth or starvation.
7. Increment year and broadcast updated state.

If any step needs to queue multiple effects, do not reorder them. Determinism is required.
