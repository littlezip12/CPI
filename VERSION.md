# WPI 7.56.12 — Live Game Setup & Scoring Finish

WPI 7.56.12 is a frontend workflow-finish release built directly on the validated **7.56.11 Live UI Polish** baseline.

## Release focus

- Turns manual pregame setup into a clear three-step flow: **Match details → Roster → Starting lineup**.
- Moves delivery/visibility preferences behind a secondary setup control so normal game setup stays short.
- Tightens the mobile scorer surface without removing any structured analytics event.
- Keeps the six primary poolside actions: **Goal, Save, Steal, Exclusion, Turnover, 5M**.
- Automatically preselects the current-quarter goalie for **Save** while keeping the player field editable.
- Stops normal event selection from automatically opening the Player selector on phones.
- Makes quarter transitions explicit: **Q1 complete + current score → confirm Q2 starters → Start Q2**.
- Further simplifies scorer transfer with a clear **Waiting → Accepted** state and a shorter read-only message on the prior device.
- Makes Game Day the clearest first action on the dashboard.

## Reliability preserved

- Every recorded action remains eligible for GroupMe delivery on fresh games.
- Goal, Save, Field Block and all structured event data remain analytics-ready.
- Final Whistle retains the awaited final persistence/delivery path.
- GroupMe Topic delivery and Bot fallback are unchanged.
- Delivery persistence, retry, audit and exactly-once protections are unchanged.
- One active scorer per game remains enforced across signed-in and Guest Scorer handoff.
- Admin takeover, previous-scorer read-only, OT and shootout behavior remain unchanged.

## Backend / deployment

- No Supabase migration.
- No GroupMe secret change.
- No Edge Function redeploy required.
- `js/live-backend-v7-56-8.js`, the GroupMe Edge Function, Topic migration and full connected setup SQL remain protected.
