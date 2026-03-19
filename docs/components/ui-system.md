# Component: UI System

## Responsibility
Render the text-only UI from server state and submit player actions.

## Layout
- Left: event log and chat
- Center: tabbed command area
- Right: command summary for resources, credits, structures, units, and defences

## Main Tabs
- Dashboard
- Economy
- Trade
- Constructions
- Military
- Defences
- Research
- War Room
- Management

## Rules
- Credits are always visible in the UI.
- Trade uses a per-transaction credit fee.
- Manual trade orders settle after 3 months instead of resolving instantly.
- Trade amounts support sliders and numeric entry, with limits derived from current stock, credits, and storage.
- Auto trade can buy or sell a configured amount once per year until cancelled.
- Constructions is the renamed structure-management tab.
- War Room uses dynamic assault and missile selections driven by unit metadata.
