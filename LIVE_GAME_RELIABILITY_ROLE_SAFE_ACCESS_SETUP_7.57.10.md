# WPI 7.57.10 — Game Reliability & Role-Safe Access

## Supabase
Apply exactly one migration:

`supabase/migrations/202608090002_game_reliability_role_safe_access.sql`

No Edge Function redeploy is required. Do not change GroupMe or OpenAI secrets.

## What changes
- Planned Tournament/Friendly save + optional scorer assignment is atomic.
- WPI verifies the saved row before closing the dialog.
- WPI verifies scorer state can load before navigating into scoring.
- Viewer and Scorer experiences are simplified; Owner/Admin retain full administration.
- All pending/new invitations are Viewer-first. Owner/Admin promote accepted members afterward.
- Existing accepted memberships are not downgraded.
- First-owner bootstrap remains the one intentional Owner exception.

## Hosted acceptance
1. Owner/Admin creates a Friendly, assigns a scorer, saves it, and sees it remain on Game Day.
2. Start the Friendly and confirm the scorer opens instead of returning to dashboard.
3. Repeat with Tournament.
4. Sign in as Scorer: only the focused scoring-assignment experience should be visible.
5. Sign in as Viewer: only the simplified game browser should be visible; live/final games open read-only.
6. Create a new invitation: there is no role selector. Accept it and confirm the new member is Viewer.
7. Owner/Admin promotes the accepted Viewer to Scorer and confirms assigned-game launch works.
