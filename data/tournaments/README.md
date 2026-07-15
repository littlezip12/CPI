# CPI normalized tournament data

Release 7.41.0 separates tournament evidence into three durable layers:

1. `registry.json` — one authoritative list of events, divisions, source tabs, parser types, and public pages.
2. `raw/<event>/<division>.csv` — untouched source snapshots used for audit and reprocessing.
3. `normalized/<event>/<division>.json` — standardized game records with stable IDs, source rows, seeds, bracket references, scores, advancement destinations, and canonical identities.

QA reports are written to `qa/<event>/<division>.json`. Review items remain visible; structural blockers fail `./release-check`.

## Synchronize live sheets

```bash
python3 scripts/sync-tournament-data.py --sync-enabled --allow-partial
```

The command fetches the 23 active Junior Olympics divisions. It writes new files only when source CSV content changes. Existing public JO pages continue to poll Google Sheets directly every two minutes; the normalized layer is the durable evidence bank for profiles, rankings, and historical results.

Other commands:

```bash
# One division
python3 scripts/sync-tournament-data.py \
  --division 2026-jo-weekend-2 14u-boys-classic

# Rebuild from an already banked raw snapshot without internet
python3 scripts/sync-tournament-data.py \
  --division 2026-jo-weekend-1 14u-girls-championship \
  --no-fetch

# Validate parser behavior and all banked outputs
python3 scripts/test-tournament-pipeline.py
python3 scripts/validate-tournament-data.py
```

## Identity behavior

- Tournament seeds are integers stored separately from team names.
- `W31`, `L30`, and similar bracket references are not teams.
- `W#31 - NorCal` preserves `W#31` as source-reference metadata and treats `NorCal` as the participant.
- Canonical team and club IDs come from the 7.40 identity registry.
- An ambiguous source name is never guessed. Verified source-specific mappings live in `config/tournament-identity-overrides.json`; everything else remains an explicit review item.

## Automatic snapshots

`.github/workflows/sync-tournament-data.yml` runs every six hours and can also be launched manually from GitHub Actions. It commits only when a source sheet actually changes.
