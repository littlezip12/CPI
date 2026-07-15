# CPI 7.42.1

Tournament Sync Safety Hotfix.

- Rejects live Google Sheet candidates that normalize to zero games or contain blocking defects.
- Rejects severe game-count collapses relative to the last banked snapshot.
- Tries alternate GIDs and the configured sheet-name fallback before giving up.
- Preserves the last known-good raw, normalized, QA, identity, and evidence data when every live candidate is invalid.
- Records stale-source warnings in `data/tournaments/qa/sync-latest.json`.
- Adds regression tests so invalid live responses can never erase a valid tournament bank.

The normalized tournament schema and evidence release remain 7.42.0; this is a sync-safety code hotfix.
