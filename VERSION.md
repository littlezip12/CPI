# WPI 7.57.0 — Team Administration & Roster Onboarding Foundation

WPI 7.57.0 is built directly on the validated **7.56.15 Tournament-Scale GroupMe Summary Reliability** baseline.

## Release focus

- Starts the scalable WPI Live Team Administration phase without rebuilding the proven scoring backend.
- Adds a Team Readiness overview for Team Profile, Roster, Score Updates and Team Access.
- Adds a permanent Team Profile editor for Team Owner/Admin users.
- Makes the roster a first-class team asset instead of something users have to rebuild game-by-game.
- Adds **Take photo**, **Upload image**, and **Enter manually** roster paths.
- Photo/image import performs OCR in the browser, creates a draft roster, and requires explicit human review before saving.
- The camera input is mobile-friendly (`capture="environment"`) so a roster sheet can be photographed directly from a phone.
- Imported rows remain fully editable; users can add/remove players and correct names or cap numbers before saving.
- Manual roster entry remains a first-class path and can also edit an existing roster at any time.
- Confirmed roster data is stored in the existing `live_players` / active roster model and is automatically reusable by new games.
- Team profile and roster edits remain Owner/Admin-only; Scorer/Viewer access remains read-only for durable team configuration.
- No OCR result is auto-saved. The roster photo itself is not persisted by WPI; only confirmed structured roster rows are saved.

## OCR implementation

Roster reading is loaded only when the user chooses a photo/image import. WPI uses browser-side Tesseract.js OCR through its documented CDN build. If OCR cannot load or a roster cannot be parsed reliably, the same review screen falls back to manual entry rather than blocking onboarding.

## Protected foundation

The following 7.56.15 behaviors remain authoritative and must not regress:

- exactly one active scorer per game
- signed-in scorer transfer and QR/no-account Guest Scorer handoff
- previous scorer read-only after transfer
- Admin emergency takeover
- mobile-first scoring with direct action families and team-name Goal variants
- End Quarter lineup flow without opening the normal Player selector
- GroupMe Topic delivery plus Bot/main-chat fallback
- retries, audit and exactly-once delivery behavior
- Final Whistle -> ordered multipart Game Summary sequencing
- tournament-scale Scores topic usage across multiple games
- compact <=280-character summary audit notes and <=900-character GroupMe summary chunks

## Infrastructure

No new Supabase migration, GroupMe secret, database password, or Edge Function redeploy is required for 7.57.0. The release uses existing Owner/Admin RLS policies for `live_teams`, `live_rosters`, and `live_players`.

## Next 7.57.x steps

- multiple team/club administration and team switching
- improved invitation/access-management views
- scoped `Can manage tournament GroupMe` permission
- self-service team activation/onboarding beyond the first pilot team
- scalable multi-team / multi-club setup while preserving the 7.56.15 scoring reliability boundary
