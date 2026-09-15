# WPI 7.64.5 — Mobile Recap & Opponent Search Polish — Handoff

## Baseline
Built from pushed WPI 7.64.4 ZIP `CPI-main - 2026-09-14T214727.665(1).zip`.

## Scope
1. Final-game mobile action area no longer renders three cramped equal-width tiles.
   - Back to dashboard: primary, full width.
   - Reopen game: compact caution action.
   - Download log: compact utility action.
   - Very narrow phones stack all actions.
2. Game-Day Hub opponent entry uses a custom mobile/iOS type-ahead.
   - Starts after two characters.
   - Prefix/substring matching across team, club, group, age, gender, and location.
   - Current age/gender is prioritized.
   - One- and two-edit typo tolerance for longer queries (e.g. `Standord` can still surface Stanford).
   - Eight results maximum for touch usability.
   - Team logo + team/group context are shown.
   - Manual/unlisted entry remains available.
   - Selecting a result dispatches through the existing opponent identity preview/reconciliation path.

## Safety
No Supabase migration. No protected scorer/backend changes. No Edge Functions, secrets, billing, hosting, or infrastructure changes.

## Gate
`./release-check-live-7.64.5`
