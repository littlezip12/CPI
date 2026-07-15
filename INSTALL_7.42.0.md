# Install CPI 7.42.0

Use Terminal to merge the patch so the hidden `.github` workflow is copied correctly and existing folders are not replaced.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.42.0-FULL-JO-BANKING-AND-EVIDENCE-PATCH*.zip' -print -quit)"
echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"
```

The `echo` command should print the downloaded ZIP path. If it prints a blank line, confirm the patch is in Downloads before continuing.

Then validate:

```bash
chmod +x release-check
chmod +x scripts/build-tournament-evidence.py
chmod +x scripts/validate-tournament-evidence.py
chmod +x scripts/sync-tournament-data.py
chmod +x scripts/tournament_pipeline.py
chmod +x scripts/test-tournament-evidence-ui.js

./release-check
```

Expected new validation sections:

```text
TOURNAMENT EVIDENCE VALIDATION PASSED
 - 48 stable tournament participant identities
 - 39 canonical CPI teams have profile-ready evidence
 - 9 tournament-only teams remain outside published rankings

TOURNAMENT EVIDENCE UI TESTS PASSED
```

The checked-in baseline contains one banked dataset because the development environment cannot reach the live Google Sheet CSV endpoints. After pushing, open GitHub **Actions**, choose **Sync tournament data**, and run the workflow once. It will attempt all 23 enabled JO divisions, rebuild profile evidence, and commit changed snapshots automatically.

Commit only after `./release-check` passes:

```bash
git status
git diff --stat
git add -A
git commit -m "Add full JO data banking and tournament evidence"
```

Push with GitHub Desktop if Terminal authentication is not configured.
