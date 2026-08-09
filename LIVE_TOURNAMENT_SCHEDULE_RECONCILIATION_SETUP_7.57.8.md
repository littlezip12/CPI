# WPI Live 7.57.8 — Tournament Schedule Integration & Reconciliation

## Purpose

WPI 7.57.8 connects the private WPI Live Game-Day Hub to the public WPI Tournament platform while preserving manual tournament-game entry as a reliability fallback.

A manually created tournament game is a provisional canonical `live_games` record. When the official WPI tournament schedule later publishes the same matchup, WPI reconciles the official schedule identity onto that same record instead of creating a second unstarted game.

## Current 2026–2027 behavior

The public tournament hub currently announces the Evan Cousineau Memorial Cup for October 3–4, 2026 but does not yet publish an official schedule source. Therefore the generated Live schedule index intentionally contains zero active-season games and the hosted Game-Day Hub should show a schedule-coming-soon state. Do not fabricate tournament matchups to test automatic import.

Manual **Tournament** and **Friendly** creation remain available while the official schedule is unavailable.

## Once an official active-season schedule is published

The release builder derives `data/live/tournament-schedule-index.json` from the public Tournament platform. WPI Live then:

- identifies scheduled games for the selected WPI team;
- carries official tournament, division, date/time, venue, opponent identity, and WPI artwork into Game Day;
- creates a planned schedule-backed game only when no suitable existing manual record is present;
- links a high-confidence manual tournament fallback to the same `live_games` row;
- persists ambiguous candidates for Owner/Admin review rather than silently merging;
- prevents an already-linked official schedule game from creating a duplicate record;
- stores official-source scores separately and flags conflicts rather than overwriting the WPI Live event log or final score.

## Identity behavior

7.57.7 identity resolution remains the user-facing foundation. Raw source labels are retained for reconciliation while canonical club/team identity and logos are used for display. Examples include Stanford Black resolving through the Stanford family and CCU A / CCU Black resolving through the CC United/CCU family.

## Supabase migration

Apply exactly one migration:

`supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql`

The migration adds official schedule metadata, reconciliation-candidate metadata, a duplicate-protection index, and the following authenticated Owner/Admin RPC foundation:

- `live_sync_official_tournament_game_v1`
- `live_confirm_tournament_reconciliation_v1`
- `live_dismiss_tournament_reconciliation_v1`
- `live_game_day_queue_v3`

The sync RPC is deliberately non-destructive to WPI Live scoring state. A live/final scored game is not replaced by an official snapshot. If an official final score disagrees with WPI Live, the game is marked for reconciliation review.

## No Edge Function work

7.57.8 requires no Edge Function deployment and no new secret.

Do **not** redeploy or edit:

- `supabase/functions/groupme-post/index.ts`
- `supabase/functions/roster-extract/index.ts`
- GroupMe secrets
- `OPENAI_API_KEY`

## Local release gates

Focused:

```bash
./release-check-live-7.57.8
node --check js/live-dashboard-v7-57-8.js
```

Full:

```bash
./release-check > /tmp/wpi-7578-release-check.log 2>&1
RC=$?
echo "$RC"
tail -30 /tmp/wpi-7578-release-check.log
git restore -- data/tournaments qa
git --no-pager status --short
```

Do not push unless the full gate returns `0` and ends with `CPI release check passed.`

## Hosted acceptance while schedule is unpublished

1. Open Team Administration → Game day.
2. Confirm the WPI Tournament Schedule card shows Evan Cousineau Memorial Cup, October 3–4, 2026, and a schedule-coming-soon state.
3. Confirm manual Tournament creation remains available.
4. Start and complete a manual Tournament game.
5. Confirm Friendly still starts and scores normally.
6. Confirm Stanford/CCU identity and logo resolution still works.
7. Confirm GroupMe play delivery, Final Whistle, and Game Summary remain intact.

Automatic schedule import and true manual→official reconciliation cannot be live-validated until an official 2026–2027 schedule is published in the WPI Tournament platform.
