# WPI 7.56.11 — Live UI Polish

## Baseline
Built cumulatively from the validated/pushed WPI 7.56.10 — Post-Handoff Delivery Reliability baseline.

## Scope
7.56.11 is a Live front-end / interaction release. It does not change the connected backend architecture, Supabase schema, GroupMe secrets, GroupMe Edge Function, rankings, tournaments, clubs, or season data.

## Poolside scorer polish
- Six primary poolside actions: Goal, Save, Steal, Exclusion, Turnover, 5M.
- Exclusion and 5M expose compact Drawn / Committed variants only when needed.
- All structured events remain available under More actions, including Field Block and shot outcomes.
- Lamorinda blue/gold scoring identity is more prominent.
- Score, period, clock, and GroupMe state have stronger visual hierarchy.
- Primary submit action is larger and clearer.
- Last-play delivery status is integrated into the success card.
- Optional notes and GroupMe preview stay collapsed during normal scoring.
- Mobile bottom navigation provides Game / Updates / More.
- Mobile updates no longer auto-expand after every play.

## End Quarter focus fix
The normal action Player selector must not open after ending a quarter.

The quarter transition now:
1. blurs the currently focused scoring control,
2. clears the normal event-entry state,
3. records the quarter end,
4. opens only the next-quarter starting-lineup flow,
5. resets/blurs event entry again when starters are saved,
6. returns to a neutral scoring form for the new quarter.

This also prevents the mobile keyboard/select UI from reopening because of stale action-form focus.

## GroupMe setup polish
The normal GroupMe setup path is reduced to:
1. Tournament GroupMe
2. Score Updates Topic
3. Test connection
4. Save & use for new games

Connection name, delivery method, secret name, and other technical controls remain available behind Advanced. Existing Owner/Admin privacy boundaries are preserved.

## Reliability preserved
The 7.56.10 reliability behavior remains present:
- fresh games default to every recorded action for GroupMe delivery,
- Final Whistle uses an awaited final server sync,
- scorer transfer / Guest Scorer / Admin takeover behavior is unchanged,
- Topic delivery and Bot fallback are unchanged,
- connected backend/server delivery assets are protected by exact SHA-256 regression checks.

## Required local checks before push

```bash
./release-check-live-7.56.11
./release-check
```

The focused check must end with:

```text
WPI Live 7.56.11 focused release check passed.
```

The full check should end with:

```text
CPI release check passed.
```

## Hosted mobile smoke test after push
1. Sign in and open a brand-new game on a phone.
2. Confirm six primary event actions render cleanly.
3. Goal -> player -> time -> submit; confirm GroupMe delivery.
4. Save and Field Block (via More actions); confirm GroupMe delivery.
5. End Quarter; confirm ONLY the starting-lineup flow opens and the normal action Player selector does not open.
6. Save next-quarter starters; confirm the scorer returns with no action Player selector or keyboard unexpectedly open.
7. Transfer scoring to another device; confirm prior scorer becomes read-only.
8. Record Goal / Save / Field Block from receiving device.
9. End Game; wait for Final saved; confirm Final Whistle in GroupMe and final history.

## Deployment
No Supabase migration, secret change, or Edge Function redeploy is required for 7.56.11.
