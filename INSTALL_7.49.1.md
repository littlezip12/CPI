# Install CPI 7.49.1

## Before installing

1. In GitHub Desktop, select the CPI repository and click **Fetch origin**.
2. Pull any available remote changes.
3. Confirm no tournament sync Action is currently running.

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.49.1-TOURNAMENT-SHOOTOUTS-PLACEMENTS-STAGES-PATCH*.zip' -print -quit)"

echo "$PATCH"
ditto -x -k "$PATCH" .

find . -type d -name '__pycache__' -prune -exec rm -rf {} +
find . -name '*.pyc' -delete
find . -name '.DS_Store' -delete

chmod +x release-check \
  scripts/test-historical-results-ui-parser.js \
  scripts/test-jo-shootout-stage.js \
  scripts/validate-tournament-results-and-stages.py

./release-check
```

The full check may take more than ten minutes. Do not commit unless it ends with:

```text
CPI release check passed.
```

## Commit

```bash
git status --short
git add -A
git commit -m "Fix tournament shootouts placements and stage labels"
```

Push through GitHub Desktop.

## After deployment

Run these Actions once, in this order:

1. **Sync historical tournament archive**
2. **Sync tournament data**

Then hard-refresh Quiksilver and both JO schedule pages.
