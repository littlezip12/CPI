# Install CPI 7.45.1 — Tournament Identity Cleanup

This patch must be merged with Terminal so the hidden `.github` workflow is included.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.45.1-TOURNAMENT-IDENTITY-CLEANUP-PATCH*.zip' -print -quit)"

echo "$PATCH"

ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"

rm -f .DS_Store data/.DS_Store data/site-flow-qa-7-15.textClipping \
  data/tournaments/normalized/2026-jo-weekend-2/manifest.json \
  data/tournaments/qa/2026-jo-weekend-2/sync-latest.json

chmod +x release-check
chmod +x scripts/validate-tournament-identity-cleanup.py

./release-check
```

The final output must include:

```text
TOURNAMENT IDENTITY CLEANUP VALIDATION PASSED
 - 973 real tournament participant identities remain after placeholder removal
 - 248 participants resolve to canonical CPI teams
 - 725 verified tournament-only teams remain outside rankings
 - 6520 bracket/pool slots remain structured references rather than teams

CPI release check passed.
```

Then commit:

```bash
git status --short
git add -A
git commit -m "Clean tournament identities and source verification"
```

Push with GitHub Desktop.
