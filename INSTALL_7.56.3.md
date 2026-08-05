# Install WPI 7.56.3 — Live Event Delivery Dispatch Reliability

Apply this cumulative browser patch over the pushed WPI 7.56.2 connected baseline.

This release addresses a pilot defect where plays were stored in `live_events`, but no corresponding `live_deliveries` row was created and the scorer UI remained at **Queued**.

## What changes

- Deterministic remote event IDs from the event upsert response
- Fallback server-event lookup before delivery
- Visible failure/retry state instead of silent queued-only skips
- Automatic queued-delivery recovery when a scorer reopens a game
- Immediate delivery-status refresh after dispatch
- New 7.56.3 asset URLs to prevent stale browser JavaScript

## Hosted services

No SQL migration is required. Do not rerun the full setup SQL.

No GroupMe bot, Supabase secret, or Edge Function change is required. The deployed `groupme-post` function remains valid.

## Validation

Run:

```bash
./release-check
```

Commit only after the final line is:

```text
CPI release check passed.
```

After GitHub Pages deploys, reopen the queued game. WPI 7.56.3 will attempt due queued messages automatically. Confirm `OPTIONS 200`, `POST 200`, a new `live_deliveries` row, and a received GroupMe message.
