# WPI 7.57.1 — High-Accuracy Roster Import Handoff

## Baseline
Built on WPI 7.57.0 Team Administration & Roster Onboarding Foundation, which in turn preserves the validated WPI 7.56.15 scoring / GroupMe foundation.

## Why 7.57.1 exists
The first 7.57.0 browser OCR proof-of-concept was not accurate enough on a clear real-world roster photo. It returned only part of the roster and produced corrupted names/cap numbers. 7.57.1 replaces that primary extraction path rather than layering more parsing rules on bad OCR.

## New architecture

`Take Photo / Upload Image -> browser normalization -> authenticated Supabase Edge Function -> OpenAI vision + strict JSON schema -> confidence-aware draft -> human review -> Save roster`

- Browser Tesseract is removed from the primary roster path.
- Browser normalizes the image to JPEG (max dimension 2400px) before invoking the function.
- The Edge Function is `supabase/functions/roster-extract/index.ts`.
- Only a signed-in Team Owner/Admin can invoke extraction for that team.
- `OPENAI_API_KEY` exists only as a Supabase Edge Function secret.
- Default model is `gpt-5.6`; optional `OPENAI_ROSTER_MODEL` can override it server-side.
- OpenAI request uses `store: false`.
- Structured output schema returns only `cap`, `name`, `confidence`, and warnings.
- The prompt explicitly forbids inventing/autocompleting unreadable players.
- High-confidence rows show Ready. Medium/low confidence rows show Review.
- No extraction result auto-saves.
- Manual roster setup remains first-class and is the fallback if the function/provider is unavailable.
- WPI does not persist the uploaded image in the team record.

## Deployment requirements
No database migration is required.

Before hosted photo testing:
1. Add Supabase Edge Function secret `OPENAI_API_KEY`.
2. Deploy function `roster-extract` from `supabase/functions/roster-extract/index.ts`.
3. Do not redeploy or modify `groupme-post`.
4. Deploy/push the static WPI 7.57.1 files after release checks pass.

See `LIVE_ROSTER_VISION_SETUP_7.57.1.md` for exact setup guidance.

## Acceptance criteria
A clear roster photo should produce the same count/order as the visible roster, with sensible cap/name pairs. Uncertain rows must be flagged Review, not silently marked Ready. Human confirmation remains mandatory.

The real roster image supplied during development should be used as the first hosted acceptance test. It visibly contains 14 roster rows. Do not add that personal roster image to the repository or test fixtures.

## Protected 7.56.15 foundation
Do not regress:
- exactly one active scorer
- signed-in and Guest Scorer handoff
- Admin takeover
- previous scorer read-only after transfer
- structured scoring events
- End Quarter lineup flow
- GroupMe Topic delivery and Bot fallback
- retries/audit/exactly-once behavior
- Final Whistle -> ordered multipart Game Summary
- tournament-scale Score topic behavior
