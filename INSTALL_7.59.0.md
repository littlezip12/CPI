# Install WPI 7.59.0 — Lamorinda Club Pilot Ready

1. Apply the patch ZIP at the repository root.
2. Run `./release-check-live-7.59.0`.
3. Run `./release-check-clean`. It executes the complete `./release-check` and then restores gate-generated `data/tournaments` / `qa` artifacts to their pre-check state so the validation run does not create Git conflicts.
4. Commit/push only after the full gate ends with `CPI release check passed.`
5. Open the live dashboard and confirm the 7.59.0 pilot-ready milestone banner on **All Lamorinda Teams**.

There is **no Supabase migration**, **no Edge Function redeploy**, and **no new secret** for 7.59.0.

This is a stabilization/milestone release. Offline/reconnect is intentionally deferred resilience work. Official 2026–2027 tournament-feed validation remains an external dependency until a real schedule source is published.
