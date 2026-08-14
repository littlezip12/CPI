# WPI 7.58.8 — Club-Branded Game Experience

## Install

From the existing CPI repository folder:

```bash
cd /Users/tylerdeshazer/Documents/GitHub/CPI
unzip -o ~/Downloads/WPI-7.58.8-CLUB-BRANDED-GAME-EXPERIENCE-PATCH.zip -d .
chmod +x release-check release-check-live-7.58.8
./release-check-live-7.58.8
./release-check
```

If the full gate ends with `CPI release check passed.`, commit and push with GitHub Desktop.

## Supabase / Edge Functions

None for 7.58.8.

- No database migration.
- No Edge Function redeploy.
- No new secret.

## Live validation

Open a Lamorinda game and confirm:

1. The scoring workflow/layout is unchanged.
2. The active game page uses Lamorinda navy/blue/gold styling.
3. The background is a restrained pool/water treatment with blue/gold accents rather than a flat white page.
4. The scoreboard contains a subtle Lamorinda crest watermark.
5. Event buttons, scoring CTA, toolbar and mobile nav use the Lamorinda theme while keeping the same controls and touch targets.
6. A non-Lamorinda team name does not receive the Lamorinda theme.

