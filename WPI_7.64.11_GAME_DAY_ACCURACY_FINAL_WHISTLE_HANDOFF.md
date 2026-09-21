# WPI 7.64.11 — Game-Day Accuracy & Final Whistle

Built from pushed WPI 7.64.10 baseline `CPI-main - 2026-09-16T221719.671.zip`.

Scope:
- explicit per-game Played/DNP participation and game-cap persistence
- Games Played no longer depends on whether a player recorded a stat
- Fast Scorekeeping: routine stats inherit the current clock; goals/exclusions/5Ms retain Quick Time
- Edit Last Play and sent-message correction notices
- End Quarter confirmation + immediate Undo end quarter recovery
- correction/participation changes refresh canonical final analytics
- Final Whistle explicitly dispatches Game Story + team stats to GroupMe
- team stats are rendered as a PNG and uploaded to GroupMe Image Service
- player-stat dump removed from GroupMe; player detail stays in WPI

Infrastructure:
- migration `202609210001_game_day_accuracy_final_whistle.sql`
- new versioned Edge Function `groupme-post-v7-64-11`, verify_jwt=true
- existing protected `groupme-post` remains byte-stable
- no secret rotation required

Historical BAWPL note:
- Max Cho and Jackson Pangilinan played vs CCU but had no event/lineup evidence in the old data. The generic migration cannot safely infer that fact. After deployment, add explicit `played` participation for those two CCU records as a one-off production correction.
