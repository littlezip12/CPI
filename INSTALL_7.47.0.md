# Install CPI 7.47.0

Merge the patch into the root of the existing CPI repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.47.0-TOURNAMENT-LIVE-OPERATIONS-PATCH*.zip' -print -quit)"
ditto -x -k "$PATCH" .
chmod +x release-check scripts/build-tournament-operations.py scripts/check-public-tournament-pages.py scripts/test-tournament-operations-engine.py scripts/validate-tournament-operations.py scripts/test-tournament-operations-ui.js
./release-check
```

Expected new validation sections:

- `PUBLIC TOURNAMENT PAGE CHECK PASSED`
- `TOURNAMENT OPERATIONS BUILD COMPLETE`
- `TOURNAMENT OPERATIONS ENGINE TESTS PASSED`
- `TOURNAMENT OPERATIONS VALIDATION PASSED`
- `TOURNAMENT OPERATIONS UI TESTS PASSED`
- `CPI release check passed.`

Commit:

```bash
git status --short
git add -A
git commit -m "Add tournament launch readiness and live operations"
```

Push through GitHub Desktop. Then run **Actions → Sync tournament data → Run workflow** once.
