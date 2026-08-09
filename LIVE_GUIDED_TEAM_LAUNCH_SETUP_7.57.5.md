# WPI 7.57.5 — Guided Team Launch & Readiness

## Scope

This release is a browser UX/onboarding release. It does **not** add a database migration, Supabase secret, or Edge Function deployment.

The Team Administration Overview now acts as a guided launch checklist:

1. Team profile
2. Roster (minimum valid starting lineup)
3. Scoring access
4. Tested + active GroupMe score-updates route

WPI calculates readiness from existing authoritative team data. It presents a single recommended next step and automatically advances after each saved change. Once all four checks pass, the team receives a **Game-day ready** state and a direct new-game launch action.

## Role behavior

- Owner / Admin: receives actionable guided setup controls.
- Scorer / Viewer: sees readiness status but permanent setup changes remain read-only.
- Starting a game is not newly blocked by this release; an Owner/Admin can still start before setup is complete, but the UI deliberately de-emphasizes that path.

## Reliability boundary

7.57.5 does not modify:

- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- `supabase/migrations/202608080004_self_service_groupme_setup.sql`
- `js/live-team-context-v7-57-3.js`
- `js/live-groupme-setup-v7-57-4.js`

## Supabase

**Nothing to do.** No SQL and no function redeploy for 7.57.5.

## Hosted acceptance

Test both a complete team and, if available, a newly created/incomplete team. Confirm:

- progress updates correctly
- the next-step CTA jumps to the correct setup section
- roster readiness uses 6 starters for 12U/below and 7 for 14U+
- GroupMe requires enabled + last successful test
- complete setup shows `Game-day ready`
- Start New Game remains functional
- existing scoring, handoff, GroupMe delivery, Final Whistle and summary behavior are unchanged
