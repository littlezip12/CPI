# CPI Tournament Data

Release 7.43 separates tournament information into durable, auditable layers:

- `registry.json`: authoritative event and division source registry. One source publishes each division.
- `raw/`: exact source CSV snapshots.
- `normalized/`: standardized, source-traceable schedule and result records.
- `qa/`: parser, identity, source, and sync issues by dataset.
- `health/index.json`: source freshness, schedule counts, event phase, and stale/error states.
- `identity/participants.json`: stable identities for every real tournament team, including tournament-only teams.
- `evidence/index.json`: team-centric event, record, and recent-game evidence.
- `evidence/ranking-review.json`: manual ranking and identity review queues.
- Browser `runtime.js` files: static GitHub Pages data for profiles and dashboards.

Scheduled games and completed games are separate. Empty scores, partial scores, and blank `0-0` cells do not create final results. Tournament-only identities never become published CPI ranking teams automatically.

Run one cached dataset:

```bash
python3 scripts/sync-tournament-data.py --division 2026-jo-weekend-1 14u-girls-championship --no-fetch
```

Run all enabled JO sources:

```bash
python3 scripts/sync-tournament-data.py --sync-enabled --allow-partial
```

Rebuild evidence and source health from existing normalized data:

```bash
python3 scripts/build-tournament-evidence.py
python3 scripts/build-tournament-health.py
```

## WPI 7.54.0 reusable tournament platform

`data/tournaments/platform/registry.json` is the public platform registry. `tournament.html` is the shared viewer, and event bundles live under `data/tournaments/platform/events/`. The first controlled migration is `2026-quiksilver-cup`; other events remain on their proven viewers until explicitly migrated. Source adapters and schema contracts live under `tournaments/schema/`. Historical data never publishes rankings automatically.
