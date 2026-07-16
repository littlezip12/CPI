# CPI 7.44.3 — Boys JO Guaranteed Schedule Load

This hotfix removes the remaining network dependency from initial Boys JO page rendering.

All 12 verified official schedules are built directly into `tournaments/jo-boys/app.js`. The page renders the selected division immediately, then checks Google Sheets for a newer live version in the background. Google CORS failures, stale GIDs, slow JSONP requests, or missing external CSV snapshots can no longer leave the schedule blank.

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.44.3-BOYS-JO-GUARANTEED-LOAD-HOTFIX*.zip' -print -quit)"
echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"
chmod +x release-check scripts/test-jo-boys-embedded-fallback.js
./release-check
```

Commit only after the complete release check passes.
