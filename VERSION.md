# WPI 7.56.13 — Game Actions & Automatic GroupMe Summary

WPI 7.56.13 is a focused game-day scoring release built directly on the validated **7.56.12 Live Game Setup & Scoring Finish** baseline.

## Release focus

- Removes the **More actions** drawer from the primary scorer.
- Replaces it with seven direct poolside actions: **Goals, Shots, Saves, Steals, Exclusions, Turnover, 5M**.
- Goals expose **Us / Them** variants.
- Shots expose **Missed / Post / Blocked / Saved** outcomes.
- Saves expose **Goalie save / Field block** so Field Block remains directly accessible with no hidden event menu.
- Exclusions and 5M preserve **Drawn by us / Committed by us** variants.
- All existing structured event types remain available for analytics.
- Ending a game now creates one auditable **Game summary** system event and queues its GroupMe message after Final Whistle.
- Summary delivery uses the existing persisted-event, exactly-once delivery, retry and audit pipeline; no new secret or delivery transport is introduced.
- The GroupMe summary includes final score, team shots, goals, assists, saves, field blocks, steals, turnovers, exclusions drawn, 5M drawn and up to three recorded contributors.
- Existing 7.56.12 setup, scorer handoff, quarter transitions, connected backend, Topic delivery, Bot fallback and final-save reliability remain protected.

## Deployment

This release requires the small forward migration `supabase/migrations/202608080001_game_summary_event.sql` so `live_events` can persist the new `game_summary` audit event. It requires **no secret change and no Edge Function redeploy**.
