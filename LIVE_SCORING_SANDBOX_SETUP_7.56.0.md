# WPI Live Scoring Sandbox — 7.56.0

## Post-Q4 workflow

Tapping **End quarter** in Q4 records the end of regulation at `0:00` and opens three choices:

1. **End game**
2. **Start overtime**
3. **Start shootout**

## Overtime

The scorer chooses a one-, two-, or three-minute overtime period and either a single period or multiple overtime periods / halves. Each additional period reuses the prior lineup and restores the selected OT clock.

## Offensive shot tracking

All four non-goal shot outcomes describe a Lamorinda offensive attempt and require the Lamorinda shooter:

- **Shot missed the goal**
- **Shot off the post**
- **Shot blocked in play**
- **Shot saved by opponent goalie**

A blocked shot credits the opposing team with a field block at team level while retaining the Lamorinda shooter. A saved shot credits the opposing goalie with a save at team level while retaining the Lamorinda shooter.

Lamorinda defensive actions remain separate:

- **Field block** — select the Lamorinda defender.
- **Goalie save** — select the Lamorinda goalie.

This keeps offensive shot attribution and defensive player attribution distinct without requiring duplicate entries.

## Shootout

Before the shootout, select which team shoots first. Attempts alternate automatically. Goal/Miss records immediately, Undo last shot remains available, and successful attempts add `0.1` to the displayed score.

## Current environment

The sandbox remains in local demo mode with browser-local storage and mock GroupMe delivery. It cannot affect rankings, official tournament data, profiles, or historical archives.
