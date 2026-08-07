# WPI 7.56.9 — Live UX Refresh

Date: 2026-08-06
Baseline: CPI-main - 2026-08-06T223940.070.zip

## Goal
Frontend UX refresh on top of the authoritative 7.56.8 foundation, while preserving the full backend and delivery behavior already approved.

## What changed

### 1) Mobile-first scoring refresh
- Scoring console refreshed toward the approved mockup direction.
- Added adaptive quick-action event buttons for the most common plays.
- Kept the full event dropdown as a fallback for all supported events.
- Moved **Time of play** later in the action flow so it appears after event and player selection.
- Submit button now adapts to the selected event label (example: `Submit Goal`).
- Manual controls relabeled to **More controls**.

### 2) Lamorinda team-branded scoring experience
- Added Lamorinda blue/gold visual treatment to the scorer experience and handoff flow.
- Kept the broader WPI shell and structure intact.

### 3) Simpler GroupMe setup
- Reworked the dashboard GroupMe panel into a clearer setup flow:
  1. Tournament GroupMe
  2. Score Updates Topic
  3. Test connection
  4. Save & use for new games
- Moved technical configuration behind an **Advanced** disclosure.
- Added a visual status pill for current setup state.

### 4) Simpler scorer handoff
- Simplified the transfer-scoring language.
- QR remains the primary path.
- Backup code and backup link remain supported, but the fallback link is now tucked behind a disclosure.

### 5) Versioning / release metadata
- Added new frontend assets:
  - `css/live-sandbox-v7-56-9.css`
  - `js/live-dashboard-v7-56-9.js`
  - `js/live-sandbox-v7-56-9.js`
  - `js/live-scorer-handoff-v7-56-9.js`
- Updated live pages to point to 7.56.9 frontend assets.
- Updated `config/site-release.json` to 7.56.9 / `Live UX Refresh`.
- Updated `config/live-sandbox.js` and `config/live-sandbox.example.js` release markers to 7.56.9.

## Explicitly preserved from 7.56.8
- Topic delivery foundation
- Bot fallback path
- exactly-once style delivery flow / retry / audit behavior already built
- scorer transfer model
- Guest Scorer Pass flow
- admin takeover flow
- overtime / shootout / final-whistle sequencing
- connected backend / auth / persistence foundation

## Primary files changed
- `live-dashboard.html`
- `live-sandbox.html`
- `live-scorer-handoff.html`
- `live-login.html`
- `live-password-reset.html`
- `css/live-sandbox-v7-56-9.css`
- `js/live-dashboard-v7-56-9.js`
- `js/live-sandbox-v7-56-9.js`
- `js/live-scorer-handoff-v7-56-9.js`
- `config/live-sandbox.js`
- `config/live-sandbox.example.js`
- `config/site-release.json`
- `VERSION.md`

## Install / validation commands
```bash
cd /path/to/CPI-main
npm run build || true
```

Static-site validation:
- open `live-dashboard.html`
- open `live-sandbox.html`
- open `live-scorer-handoff.html`
- verify event quick buttons work
- verify GroupMe setup panel still loads groups/topics and saves/tests
- verify transfer scoring dialog still creates a pass and shows QR + backup code

## Recommended validation checklist
1. Dashboard loads in connected mode.
2. GroupMe groups load.
3. GroupMe topics load.
4. Save destination works.
5. Test message succeeds.
6. New game opens.
7. Common actions on mobile: Goal / Save / Steal / Exclusion / Turnover / 5M.
8. Time input remains easy and accurate.
9. Transfer scoring via QR or backup code still works.
10. Admin takeover still works.
11. End quarter / OT / shootout / end game still work.
12. Delivery audit and analytics data still populate.

## Release gates added
- `release-check-live-7.56.9` is the focused WPI Live push gate.
- `scripts/test-live-ux-v7-56-9.py` validates 7.56.9 UX and protects critical 7.56.8 backend/database assets with authoritative SHA-256 hashes.
- The full `release-check` now invokes the 7.56.9 focused gate instead of the exact-version 7.56.8 UI tests.
- Historical regression allowlists were extended to recognize 7.56.9 as a later site release.
