# WPI 7.57.1 — High-Accuracy Roster Import

WPI 7.57.1 is built on the 7.57.0 Team Administration & Roster Onboarding Foundation and the validated 7.56.15 scoring/delivery engine.

## Release focus

- Replaces browser Tesseract OCR as the primary roster reader.
- Photo/image imports are normalized in the browser, then sent to an authenticated Supabase Edge Function for high-accuracy vision extraction.
- The Edge Function calls OpenAI vision with strict structured output: cap number, player name, and confidence only.
- The OpenAI API key remains server-side in Supabase secrets and is never exposed in browser JavaScript, HTML, GitHub, logs, or WPI database rows.
- The OpenAI request uses `store: false`.
- WPI does not save the roster image to the team record; only the human-confirmed structured roster is persisted.
- High-confidence rows show Ready; medium/low-confidence or malformed rows are explicitly marked Review.
- No extraction result auto-saves. Review/correction remains mandatory before Save roster.
- Manual roster entry remains a first-class path and fallback if vision extraction is unavailable.
- Images are re-encoded as JPEG in-browser before upload, stripping most file metadata and keeping the server payload bounded.
- No database migration is required. One new Supabase Edge Function (`roster-extract`) and one new server-side secret (`OPENAI_API_KEY`) are required.

## Protected foundation

The validated 7.56.15 scoring engine and GroupMe reliability boundary remain unchanged: scorer authority/handoff, Topic delivery plus Bot fallback, retries/audit/exactly-once behavior, End Quarter flow, Final Whistle, tournament-scale multipart Game Summary, and structured analytics events.

## Deployment requirement

Before hosted roster-photo testing, configure the Supabase Edge Function secret `OPENAI_API_KEY` and deploy `supabase/functions/roster-extract/index.ts`. See `LIVE_ROSTER_VISION_SETUP_7.57.1.md`.
