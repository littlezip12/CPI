# Install WPI 7.56.4 — Manual Game Schema Integrity

Apply this cumulative schema-integrity patch over the pushed WPI 7.56.3 baseline.

## What this release fixes

The original `live_games` table used a four-column `UNIQUE NULLS NOT DISTINCT` constraint. Manual games have no tournament source IDs, so PostgreSQL treated each manual game's `NULL` source values as equal and returned `409 Conflict` after the first manual game for a team.

WPI 7.56.4:

- Removes that inline constraint from fresh-install SQL.
- Drops both the actual PostgreSQL-truncated constraint name and the originally expected long name.
- Adds an idempotent migration that also detects the constraint by column structure.
- Preserves official-source uniqueness with `live_games_official_source_idx`.
- Preserves stable manual-game identity with `live_games_team_client_id_idx`.
- Adds release-check regression coverage.

## Hosted WPI Live project

The hosted project was already corrected manually and has been validated with multiple new games and successful GroupMe play messages.

**Do not rerun the full setup SQL.** No GroupMe secret, Bot ID, Edge Function, or browser deployment is required for this schema correction.

The new migration is committed so future projects and rebuilds reproduce the working hosted state.

## Validation

Run:

```bash
./release-check
```

Commit only after the final line is:

```text
CPI release check passed.
```
