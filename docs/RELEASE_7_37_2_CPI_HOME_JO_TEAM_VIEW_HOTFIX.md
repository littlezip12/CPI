# CPI Release 7.37.2 — CPI Home + JO Team View Hotfix

## Purpose

This hotfix corrects two issues found after integrating the JO Girls Tournament Journey into CPI:

1. The CPI homepage was overwritten by the JO Girls Tournament Journey page.
2. The JO Girls selected-team journey appeared below the full division schedule, making it look like team selection did not update until the schedule search was used.

## Changes

- Restores the CPI homepage at `index.html`.
- Restores the root CPI `app.js` and `README.md`.
- Keeps the JO Girls tool at `tournaments/jo-girls/`.
- Moves the selected-team Tournament Journey section above the full division schedule.
- Keeps the full division schedule available below the selected-team view.
- Updates the share button label after team selection.
- Updates cache busting for the JO tool script to `v=5.3.2`.

## Manual cleanup required

If the old JO files exist at the CPI repo root, remove them before committing:

```bash
rm -rf jo-girls
rm -f "2026_NJO_Public_Sched_S1 - 14U_F_Champ.csv"
```

Then run:

```bash
git add -A
git commit -m "Release 7.37.2 CPI home JO team view hotfix"
git push
```

## No ranking changes

This release does not change CPI rankings, CPI scores, team order, aliases, regions, logos, stories, clubs, or model logic.
