# WPI Live 7.57.1 — High-Accuracy Roster Import Setup

WPI 7.57.1 replaces browser OCR with a protected Supabase Edge Function that sends a normalized roster image to OpenAI vision and returns strict structured roster rows.

## Security boundary

- `OPENAI_API_KEY` belongs only in Supabase Edge Function secrets.
- Never put the key in GitHub, browser JavaScript, `config/live-sandbox.js`, HTML, localStorage, screenshots, chat, or database rows.
- The browser re-encodes the roster image as JPEG before invoking the Edge Function.
- The Edge Function processes the image in memory and does not write it to WPI storage.
- The OpenAI request uses `store: false`.
- Only signed-in Team Owners/Admins can invoke roster extraction for their team.
- Nothing extracted is auto-saved. The user must review and explicitly Save roster.

## Required secret

Create one Supabase Edge Function secret:

`OPENAI_API_KEY`

Optional non-sensitive model override:

`OPENAI_ROSTER_MODEL`

If omitted, WPI uses `gpt-5.6`.

## Dashboard setup

Because CLI authentication has been inconvenient on this project, the supported setup path is the Supabase Dashboard:

1. Open the WPI Live Supabase project.
2. Open **Edge Functions → Secrets**.
3. Add `OPENAI_API_KEY` with the OpenAI API key value.
4. Save. Do not paste the key anywhere else.
5. Open **Edge Functions** and create/deploy a function named `roster-extract`.
6. Use the repository file `supabase/functions/roster-extract/index.ts` as the function source.
7. Deploy the function with JWT verification enabled (the default protected function behavior).
8. Do not change or redeploy `groupme-post` for this release.

## Hosted validation

After WPI 7.57.1 is deployed:

1. Sign in as Team Owner/Admin.
2. Open Team Administration → Roster.
3. Take/upload a clear roster image.
4. Confirm the number of returned rows matches the visible roster.
5. Confirm cap numbers and names are sensible and in source order.
6. Confirm uncertain rows show Review rather than Ready.
7. Correct one row manually and Save roster.
8. Refresh and verify the confirmed roster persists.
9. Start a new game and verify the roster is reusable.
10. Run one scoring/GroupMe/transfer smoke test to confirm the protected 7.56.15 foundation remains intact.

## Manual fallback

Manual roster entry is always available and does not require the Edge Function or OpenAI.
