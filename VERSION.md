# WPI 7.56.0 — Overtime, Shootout, and Shot Tracking Live Scoring

- Replaces the end-of-Q4 dead end with a choice to **End game**, **Start overtime**, or **Start shootout**.
- Supports one-, two-, or three-minute overtime periods.
- Supports either a single overtime period or multiple overtime periods / halves.
- Reuses the previous lineup before each overtime period and permits additional OT periods when configured.
- Adds four Lamorinda offensive non-goal shot outcomes: missed goal, off the post, blocked in play, and saved by the opponent goalie.
- All four offensive shot outcomes track the WPI-team shooter.
- Every offensive shot outcome records the Lamorinda shooter; opponent blocks and goalie saves are tracked at team level. Lamorinda field blocks and goalie saves remain separate defensive events.
- Adds a shootout setup step that selects which team shoots first and alternates attempts automatically.
- Records shootout Goal or Miss immediately with undo and End game available at any time.
- Represents each successful shootout attempt as 0.1 in the displayed score, for example 10–10 → 10.1–10.
- Preserves the existing roster, age-aware lineups, quarter workflow, reset, analytics, mock GroupMe delivery, rankings, tournament data, and immutable season snapshots.
