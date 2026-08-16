# WPI Live 7.61.1 — High School Schedule & Optional Delivery

## Source-backed schedule policy

WPI ships exactly the four schedules supplied by the user:

- Acalanes Men's Varsity — 15 rows
- Acalanes Women's Varsity — 12 rows
- Campolindo Men's Varsity — 9 rows
- Campolindo Women's Varsity — 6 rows

Total: 42 source rows. Thirty-seven have real start times and can sync to Game Day. Five have TBA times and remain source-only. Miramonte and all JV schedules remain unpublished; WPI does not fabricate schedule rows.

A source-backed row is identified by `high_school_schedule_id`. Sync is idempotent. If exactly one existing manual game matches the same team/opponent and is within four hours of the source time, WPI links that existing canonical game instead of creating a duplicate. Score/event/lineup history is never replaced.

## Regular season

High-school schedule games use `game_kind=regular_season` and group under `series_type=season_schedule`, displayed as **Regular Season**. Tournament and Friendly/Scrimmage Weekend behavior is unchanged.

## Score delivery

Every team has one explicit delivery mode:

- `wpi_live_only` — WPI Live score, final, recap and supporter feed. No GroupMe required.
- `wpi_live_groupme` — the same canonical WPI Live experience plus the enabled/tested GroupMe route.

Existing teams with an enabled + tested GroupMe route are automatically preserved as `wpi_live_groupme`. Other teams default to `wpi_live_only`.

Changing delivery mode updates only unstarted planned games. It does not rewrite completed games or delivery history.

## Launch readiness

Team and club launch readiness use **Score delivery**, not “GroupMe required.” WPI Live-only is fully valid. A team choosing WPI Live + GroupMe is delivery-ready after the GroupMe destination is enabled and has passed its test.
