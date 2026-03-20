# Capacity and Loss

## Storage Capacity
- Base capacity per resource is 999999.
- Economy buildings add capacity for their resource.
- Resources are clamped to capacity after each tick.

## Overflow Behavior
- Production or trade deliveries beyond capacity are discarded.
- Buy orders that overflow are partially delivered and the remainder is refunded at the unit price.
