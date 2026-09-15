# WPI 7.64.5 — Mobile Recap & Opponent Search Polish Handoff

## Baseline
Built from pushed WPI 7.64.4 ZIP `CPI-main - 2026-09-14T214727.665(1).zip`.

## Scope
- Mobile final-game actions redesigned for clean phone-width hierarchy.
- `Download game log` compacted to `Download log`.
- Visible opponent autocomplete starts at 2 characters.
- Starts-with matches rank ahead of contains matches.
- Current workspace age/gender is prioritized.
- Results show team + club/group context and use large touch targets.
- Selecting a result dispatches the existing opponent input/change flow; established WPI identity resolution remains authoritative.
- Manual opponent entry remains supported. No fuzzy auto-correction or silent identity merge.

## Safety
No Supabase migration. No protected scoring/backend changes. No Edge Function or secret changes.
