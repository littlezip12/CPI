# WPI 7.58.4 — Game Flow & Navigation Correction

This correction is applied to the pushed-but-not-yet-authoritative 7.58.4 candidate.

## Fixes

- Dashboard **Start game** still performs the validated canonical-game/scorer preparation, then opens `live-game.html` with a one-time launch intent.
- Once the scoring page has loaded and the existing Game ready check passes, WPI automatically opens Q1 starter confirmation. There is no second standalone **Start game** click.
- The Q1 lineup action now says **Confirm starters & begin**.
- GroupMe remains non-blocking: a GroupMe warning does not stop the game from starting.
- A **Dashboard** action is available from the pregame status/header and live scoring toolbar.
- After Final Whistle, the recap panel includes a prominent **Back to dashboard** action.
- Returning to the dashboard during an active game asks for confirmation; the game remains active and can be reopened from Game-Day Hub.

## Infrastructure

- **No new Supabase migration.**
- **Do not rerun** `202608130001_event_archive_game_recaps.sql` if it already succeeded.
- **No Edge Function redeploy.**
- **No new secret.**

## Validation

Run:

```bash
./release-check-live-7.58.4
./release-check
```

If the full gate ends with `CPI release check passed.`, commit and push normally, then validate the live game flow before declaring 7.58.4 authoritative.
