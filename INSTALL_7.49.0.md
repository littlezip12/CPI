# Install CPI 7.49.0

Merge this patch into the root of the existing CPI repository, then run:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

find . -type d -name '__pycache__' -prune -exec rm -rf {} +
find . -name '*.pyc' -delete

chmod +x release-check \
  scripts/build-tournament-archive.py \
  scripts/build-historical-profiles.py \
  scripts/test-historical-tournament-parser.py \
  scripts/test-historical-profile-engine.py \
  scripts/validate-tournament-archive.py \
  scripts/validate-historical-profiles.py

./release-check

git status --short
git add -A
git commit -m "Complete historical results and profile integration"
```

Push through GitHub Desktop. After deployment, run **Sync historical tournament archive** once so any newly accessible source divisions are normalized with the updated parser and historical profile outputs are regenerated.

Historical results remain profile-only and cannot modify or publish CPI rankings.
