# CPI 7.42.1 — Tournament Sync Safety Hotfix

This hotfix addresses a GitHub Actions failure where a Google Sheets response normalized to zero games and temporarily replaced the in-workflow 192-game 14U Girls bootstrap dataset.

## What changes

- Parses each live CSV candidate before writing any file.
- Rejects zero-game, blocking, and severely truncated candidates.
- Tries configured GID aliases and the sheet-name URL automatically.
- Preserves the last known-good snapshot when all live candidates are invalid.
- Adds automated sync-safety regression tests.

## Install

From the CPI repository root:

```bash
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.42.1-TOURNAMENT-SYNC-SAFETY-HOTFIX*.zip' -print -quit)"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"
chmod +x release-check scripts/sync-tournament-data.py scripts/test-tournament-sync-guard.py
./release-check
```

Then commit and push:

```bash
git status
git add -A
git commit -m "Protect tournament bank from invalid live sheet responses"
```

Push through GitHub Desktop. Then rerun **Actions → Sync tournament data → Run workflow**.
