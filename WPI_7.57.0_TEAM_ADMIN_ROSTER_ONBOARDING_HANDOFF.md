# WPI 7.57.0 — Team Administration & Roster Onboarding Foundation

Built from the validated/pushed WPI 7.56.15 authoritative repository ZIP:
`CPI-main - 2026-08-07T233133.979.zip`

## Release purpose

Begin the scalable WPI Live Team Administration phase without rebuilding the validated scoring engine.

## Included in 7.57.0

### Team Administration dashboard
- Team Readiness overview
- Team Profile editor
- Team Roster manager
- Team Access invites
- GroupMe tournament score-updates setup
- Game History

### Team Profile
Owner/Admin users can update:
- team name
- age group

Season remains visible and read-only in this first foundation release.

### Roster onboarding
Three first-class paths:
1. Take Photo
2. Upload Image
3. Enter Manually

Photo/image workflow:
- mobile camera input supports `capture="environment"`
- OCR is loaded only when image import is requested
- image is read in the browser
- OCR output becomes a draft roster
- detected text is available for reference
- names and cap numbers are fully editable
- rows can be removed or added
- duplicate cap numbers are blocked
- no OCR result is automatically saved
- explicit Save Roster confirmation is required

Manual roster setup remains available at all times and can edit an existing roster.

Confirmed roster rows reuse the existing WPI Live `live_players` model and active team roster. New games continue to load the saved roster through the existing connected backend.

## Protected 7.56.15 foundation

Byte-for-byte protected by the 7.57.0 focused release gate:
- `js/live-backend-v7-56-8.js`
- `js/live-sandbox-v7-56-15.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/migrations/202608070001_groupme_topic_delivery.sql`
- `supabase/migrations/202608080001_game_summary_event.sql`

Therefore 7.57.0 does not alter:
- scorer authority
- Guest Scorer handoff
- signed-in scorer transfer
- Admin takeover
- exactly-one-active-scorer invariant
- GroupMe Topic delivery
- Bot fallback
- retries/audit/exactly-once behavior
- Final Whistle sequencing
- tournament-scale multipart Game Summary
- poolside scoring event engine

## Infrastructure

No new Supabase migration.
No secret change.
No Edge Function redeploy.
No database password work.

Roster/profile edits use existing Owner/Admin RLS policies already installed on the WPI Live project.

## Validation

Focused check:

```bash
./release-check-live-7.57.0
```

Expected:

```text
WPI LIVE TEAM ADMIN & ROSTER ONBOARDING 7.57.0 TEST PASSED
WPI Live 7.57.0 focused release check passed.
```

Also validated in build environment:
- `node --check js/live-dashboard-v7-57-0.js`
- Team Directory Logo 7.53.6 regression
- Release Integrity 7.52.15 regression
- Tournament Competitive Seasons 7.55.0 regression

The monolithic `./release-check` exceeded the build environment time window without a failure before timeout; run it locally as the final pre-push gate.

## Hosted acceptance test after push

1. Sign in as Owner/Admin.
2. Dashboard shows Team Readiness.
3. Team Profile loads current team name/age group.
4. Open Roster.
5. Test Take Photo with a real roster sheet.
6. Confirm OCR creates a draft and does NOT auto-save.
7. Correct at least one row manually.
8. Save roster.
9. Refresh dashboard and confirm roster persists.
10. Start a fresh game and confirm saved roster is already available.
11. Test manual roster editing as a separate path.
12. Confirm scorer/Viewer users cannot edit durable roster/profile settings.
13. Run one normal scoring/GroupMe smoke test to confirm 7.56.15 behavior remains intact.

## Next 7.57.x work

Recommended next release after this foundation validates:
- multi-team membership + team switcher
- improved team-member/access-management list
- scoped `Can manage tournament GroupMe` permission
- self-service team activation/onboarding
- multi-club administration foundation

Do not mix unrelated rankings/tournament/season data work into this Live administration phase.
