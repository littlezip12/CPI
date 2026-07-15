# CPI Tournament Data

Release 7.42 separates tournament information into durable layers:

- `registry.json`: authoritative event and division source registry.
- `raw/`: exact source CSV snapshots.
- `normalized/`: standardized, source-traceable game records.
- `qa/`: parser and identity issues by dataset.
- `identity/participants.json`: stable identities for every real tournament team, including tournament-only teams.
- `evidence/index.json`: team-centric event, record, and recent-game evidence.
- `evidence/ranking-review.json`: manual ranking and identity review queues.
- `evidence/runtime.js`: profile-ready browser data.

Tournament-only identities never become published CPI ranking teams automatically. They preserve schedules and results without forcing uncertain or out-of-state teams into the California ranking model.

Run one cached dataset:

```bash
python3 scripts/sync-tournament-data.py --division 2026-jo-weekend-1 14u-girls-championship --no-fetch
```

Run all enabled JO sources:

```bash
python3 scripts/sync-tournament-data.py --sync-enabled --allow-partial
```

Rebuild evidence from existing normalized data:

```bash
python3 scripts/build-tournament-evidence.py
```
