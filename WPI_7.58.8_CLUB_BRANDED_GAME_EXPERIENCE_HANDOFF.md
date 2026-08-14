# WPI 7.58.8 — Club-Branded Game Experience

## Purpose

Make WPI Live's active scoring page feel like the club using it while preserving the validated scorer workflow exactly as-is. Lamorinda is the first production theme. This release intentionally does not redesign or reposition scoring controls.

## Lamorinda treatment

- Lamorinda navy, blue and gold become the active-game visual palette.
- The flat gray/white page backdrop becomes a restrained pool-water/cream background using CSS gradients.
- Blue/gold paint-stroke accents sit behind the scoring shell without receiving pointer events.
- The WPI Live toolbar uses a deeper Lamorinda navy shell with a gold edge.
- The existing scoreboard becomes an off-white/glass surface with a subtle Lamorinda crest watermark.
- Existing action cards remain light and highly readable, but float over the themed background.
- Event selection uses Lamorinda blue/navy; the active icon/accent uses gold.
- Mobile navigation adopts the same club colors while keeping the validated layout/touch targets.

## Architecture

The new visual layer is deliberately separated from the protected game engine:

- `css/live-club-theme-v7-58-8.css`
- `js/live-club-theme-v7-58-8.js`

The theme resolver observes the displayed/current team name and adds `data-live-club-theme="lamorinda"` only for Lamorinda. The CSS does the rest.

This gives WPI a future club-theme registry without making club styling part of scoring state or database data. Future themes can be added as additional resolver entries + CSS blocks.

## Protected behavior

7.58.8 does not alter:

- game scoring state or event schema;
- current scoring layout or control order;
- scorer assignment/handoff/recovery;
- offline game-state isolation;
- GroupMe delivery/retry/audit;
- roster/versioning/access/following;
- archive/recap/reopen behavior;
- tournament reconciliation.

`js/live-game-v7-58-6.js` and `js/live-backend-v7-56-8.js` remain byte-stable from the pushed 7.58.7 baseline.

## Database / deployment

No Supabase migration. No Edge Function redeploy. No secrets.

## Future club roadmap

Do not manually duplicate Lamorinda CSS for every club. After Lamorinda is visually validated, create a reusable club-theme source (primary/secondary/accent/logo) from canonical WPI club identity and let the same scoring shell resolve those values. Clubs with no verified palette should retain the neutral WPI theme.
