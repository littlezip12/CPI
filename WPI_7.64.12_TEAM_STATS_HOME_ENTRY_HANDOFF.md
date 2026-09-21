# WPI 7.64.12 — Team Stats Home Entry

## Scope

- Add **Team Stats** to the initial WPI Live hero.
- Preserve the existing Team Insights analytics implementation behind the new clearer label.
- Resolve the destination using the signed-in account:
  - exactly one accessible team → open that team’s analytics directly;
  - multiple/no resolved teams → My Teams;
  - signed out → supporter sign-in.
- No database, scoring, GroupMe, billing, entitlement or tournament changes.

## Files

- `live.html`
- `js/live-home-team-stats-v7-64-12.js`
- `VERSION.md`
- `INSTALL_7.64.12.md`
- `release-check-live-7.64.12`
- `release-check`
- `scripts/test-live-team-stats-entry-v7-64-12.py`

## Validation

Run `./release-check-live-7.64.12`, then `./release-check-clean` before push.
