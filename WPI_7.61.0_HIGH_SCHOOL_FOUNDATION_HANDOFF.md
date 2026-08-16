# WPI 7.61.0 — High School Water Polo Foundation Handoff

## Product model
WPI now treats `Organization` as the parent concept. `live_clubs` is retained for backwards compatibility but gains `organization_type` with `club` and `high_school` values. Youth-club behavior is unchanged.

## Initial high schools
- Acalanes High School — Lafayette — royal blue / black / white
- Campolindo High School — Moraga — navy / red / white
- Miramonte High School — Orinda — green / black / white

Each receives:
- Men's Varsity
- Men's JV
- Women's Varsity
- Women's JV

All 12 teams use stable family keys such as `school-acalanes|hs|men|varsity`. The Platform Owner is seeded as Owner so the new workspaces can be administered immediately. Empty active 2026–2027 rosters are created; no roster members are fabricated.

## Schedules
Source policy is strict: publish only supplied schedules.
- Acalanes Men's Varsity: 15 games
- Acalanes Women's Varsity: 12 games
- Campolindo Men's Varsity: 9 games
- Campolindo Women's Varsity: 6 games
- Miramonte: schedule unpublished
- All JV teams: schedule unpublished

Total source-backed published games: 42.

7.61.0 exposes these schedules in `live-high-schools.html`. It does not fabricate missing dates and does not silently create canonical Live game records from static schedule rows. A later schedule-to-Game-Day sync can explicitly reconcile source games into Live.

## Discovery UX
Supporter discovery becomes organization-aware:
`Search → Type (Clubs / High Schools) → Organization → Age/Level → Group`.
This avoids separate products and lets future organizations scale into one WPI directory.

## Branding
High-school theming reuses the existing club-theme CSS variable contract. Game layout/scoring logic is unchanged. The school theme is selected from canonical organization identity and applied after the existing club-theme resolver.

## Protected foundation
7.61.0 does not modify:
- `js/live-backend-v7-56-8.js`
- `js/live-game-v7-58-6.js`
- `js/live-game-storage-v7-58-6.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`

## Recommended next release
WPI 7.61.1 — High School Schedule → Game-Day Integration
- source schedule rows appear inside each Varsity Game-Day Hub
- Owner can explicitly import/sync a scheduled game
- home/away/venue/time retained
- duplicate reconciliation protects manual games
- Miramonte/JV remain blank until source data arrives
