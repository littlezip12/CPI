# WPI 7.64.9 — Mobile Scoring Simplification & GroupMe Game Story

## Scope
- Fix narrow-phone connection actions so sync state, Dashboard, and Sign out no longer bunch together.
- Make Quick Time the single normal scorer workflow: Event → Player → Quick Time.
- Move goal assist and optional note into the Quick Time sheet; hide redundant legacy clock/submit controls while Quick Time is active.
- Send the same generated Game Story used by the recap to GroupMe at Final Whistle, followed by Game Stats, period scores, player stats, and scorer notes.

## Database / infrastructure
No Supabase migration. No Edge Function deployment. No secrets, billing, hosting, or protected foundation changes.

## Validation
Run `./release-check-live-7.64.9`, then `./release-check-clean`.
