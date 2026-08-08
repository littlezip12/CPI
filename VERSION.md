# WPI 7.56.11 — Live UI Polish

WPI 7.56.11 is a frontend polish release built on the validated **7.56.10 Post-Handoff Delivery Reliability** baseline.

## Release focus

- Brings the active scorer substantially closer to the approved WPI Live mobile concept.
- Uses Lamorinda blue and gold for the team scoring experience while keeping the WPI admin shell distinct.
- Promotes six poolside actions: **Goal, Save, Steal, Exclusion, Turnover, 5M**.
- Keeps Field Block, opponent goals, shot outcomes, and every other structured event accessible under **More actions**.
- Adds compact Exclusion and 5M variant choices without forcing a large universal form.
- Strengthens score → period/clock → event → player → time → submit hierarchy.
- Adds mobile **Game / Updates / More** navigation.
- Makes GroupMe delivery state easier to read without exposing technical delivery details during scoring.
- Refines the dashboard into a lighter WPI admin shell with a team-settings rail and a more focused GroupMe setup flow.
- Fixes quarter transition focus so **End Quarter never reopens the normal action Player selector**; the next-quarter lineup flow is the only player-selection UI opened by that action.

## Reliability preserved from 7.56.10

- Fresh games default to every recorded action for GroupMe delivery.
- Goal, Save, Field Block and all structured event data remain analytics-ready.
- Final Whistle uses the awaited final persistence/delivery path.
- GroupMe Topic delivery and Bot fallback remain unchanged.
- Delivery persistence, retries, audit history and exactly-once protections remain unchanged.
- One active scorer per game remains enforced.
- Signed-in scorer code claim, Guest Scorer QR/code handoff, Admin takeover and previous-scorer read-only enforcement remain unchanged.
- OT and shootout behavior remain unchanged.

## Backend / deployment

No Supabase migration is required for 7.56.11.
No GroupMe secret changes are required.
The `groupme-post` Edge Function does not need to be redeployed.

The connected backend remains `js/live-backend-v7-56-8.js`; 7.56.11 changes the presentation layer and scorer interaction code only.

## Primary validation target

Hosted phone smoke test:

1. Start a new game.
2. Record Goal, Save and Field Block/More action.
3. End Q1 and verify only the Q2 starters dialog opens — never the normal action Player selector.
4. Save Q2 starters and verify the scoring form returns neutral.
5. Transfer scoring to another device.
6. Record Goal, Save and Field Block on the receiving device.
7. End the game and confirm `Final saved` plus Final Whistle in GroupMe.
