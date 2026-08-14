# WPI 7.58.6 — Supporter Context & Manual Opponent Correction

Build this cumulatively over the pushed/validated WPI 7.58.6 baseline.

## Scope
- One Supporter viewing-team filter now controls Live now, Upcoming, Recent finals, and Tournaments & Weekends.
- `All teams` can show authorized member/followed-team archives together, with every archive card labeled by team.
- Followed-team archive access is read-only; Following still grants no scoring, roster, access, GroupMe, merge, or admin permission.
- Manual game creation explicitly supports `Search WPI or enter any team name`.
- Known identities are matched when possible; unknown opponent names are stored exactly as entered with no automatic canonical club/team creation.

## Infrastructure
- Supabase migration required: `202608130003_supporter_view_context_manual_opponent.sql`
- No Edge Function redeploy.
- No new secret.
