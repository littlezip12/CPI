# WPI 7.56.12 — Live Game Setup & Scoring Finish

Authoritative build target: the validated/pushed WPI 7.56.11 repository ZIP supplied on 2026-08-07.

## Product goal

Finish the Lamorinda pilot game-day workflow before expanding into scalable team administration.

## UX changes

- Pregame setup is organized as **Match details → Roster → Starting lineup**.
- GroupMe/message-frequency/visibility controls remain available but are secondary to normal setup.
- The phone scorer retains the six primary actions: Goal, Save, Steal, Exclusion, Turnover, 5M.
- Save smart-selects the current-quarter goalie while leaving the selection editable.
- Selecting a normal event on a phone no longer automatically focuses/opens the Player selector.
- Quarter transitions show the completed quarter and current score before next-quarter starters.
- The next-quarter action is shortened to `Start Q2`, `Start Q3`, etc.
- Scorer transfer now has a visible Waiting → Accepted state.
- The prior scorer gets concise viewing-only language after transfer.
- Dashboard Game Day is a clearer primary action.

## Reliability boundary

No Supabase migration, GroupMe secret change, or Edge Function change.

Protected unchanged assets:

- `js/live-backend-v7-56-8.js`
- `supabase/functions/groupme-post/index.ts`
- `supabase/migrations/202608070001_groupme_topic_delivery.sql`
- `supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql`
- `js/live-dashboard-v7-56-9.js`
- `js/live-scorer-handoff-v7-56-9.js`

7.56.10/7.56.11 reliability invariants remain: every-action delivery on fresh games, scorer authority, Guest Scorer handoff, Admin takeover, structured analytics events, retries/audit, and awaited Final Whistle persistence/delivery.

## Focused validation

Run:

```bash
./release-check-live-7.56.12
```

Expected final line:

```text
WPI Live 7.56.12 focused release check passed.
```

The full `./release-check` rebuilds deterministic tournament/QA output. After it passes locally, restore generated output before commit:

```bash
git restore -- data/tournaments qa
```

Do not commit regenerated tournament/QA artifacts for this UI release.
