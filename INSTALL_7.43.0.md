# Install CPI 7.43.0

Use Terminal so the hidden `.github` workflow is merged correctly.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.43.0-JO-SOURCE-RELIABILITY-PATCH*.zip' -print -quit)"

echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"

chmod +x release-check
chmod +x scripts/build-tournament-health.py
chmod +x scripts/validate-tournament-health.py
chmod +x scripts/test-tournament-source-health-ui.js
chmod +x scripts/sync-tournament-data.py
chmod +x scripts/tournament_pipeline.py

./release-check
```

Expected final checks include:

```text
TOURNAMENT PIPELINE TESTS PASSED
TOURNAMENT DATA VALIDATION PASSED
TOURNAMENT EVIDENCE VALIDATION PASSED
TOURNAMENT SOURCE HEALTH VALIDATION PASSED
TOURNAMENT SOURCE HEALTH UI TESTS PASSED
CPI release check passed.
```

Commit after validation:

```bash
git status
git diff --stat
git add -A
git commit -m "Add JO source health and pre-tournament safeguards"
```

Push through GitHub Desktop. Then run **Actions → Sync tournament data → Run workflow** once to attempt all 23 JO divisions immediately.
