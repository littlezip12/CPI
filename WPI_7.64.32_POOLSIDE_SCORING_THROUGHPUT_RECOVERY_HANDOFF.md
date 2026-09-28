# WPHQ 7.64.32 — Poolside Scoring Throughput & Recovery Handoff

## Why this release exists

Real game-day use exposed a poolside race: a scorer could move through `Goal → team → player → time` faster than the connected UI could absorb its own realtime/autosave echoes. A remote snapshot could then rerender the scorer while an event was being composed, restoring an older UI/state or causing the exact-time play to use the prior clock. Mobile focus/double-tap behavior could also feel like the page was zooming underneath the scorer.

## 7.64.32 changes

- Introduces an event-composition draft lock. Realtime state echoes are held while a play is being selected/entered rather than replacing the local scoring controls mid-action.
- Removes the pre-commit clock blur/autosave from Quick Time. The clock and play are committed together.
- Exact-time events now have a direct numeric Quick Time field. `632` resolves to `6:32`.
- Exact-time plays require an explicit valid time and explicit **Record** (or Enter). **Use current time** fills the value but does not auto-submit.
- Adds **Back** and **Cancel** before commit. Back steps from time → player → event option; Cancel abandons the draft.
- Keeps routine-stat speed intact: routine event → player → immediate record with inherited clock.
- Adds in-flight and 650ms fingerprint duplicate protection against accidental double-submit.
- Adds mobile `touch-action: manipulation` and 16px+ input sizing to reduce double-tap/focus zoom while preserving pinch zoom.

## Reliability boundaries

7.64.31 is preserved as the server reliability layer. Its connected backend, migration, GroupMe Edge Function, final-delivery catch-up, and Final Whistle implementation are unchanged. No 7.64.32 Supabase migration or Edge Function is introduced.

## Next releases

- 7.64.33 — email/password sign-up + login UX, with magic link retained as secondary/recovery path.
- 7.64.34 — Organization Insights stable player identity + team-scoped season aggregation across roster versions/tournaments.
