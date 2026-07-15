# Install CPI 7.41.0

1. Copy the patch contents into the root of the current CPI repository and allow matching files to replace the existing versions.
2. Open Terminal and enter the CPI repository:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
```

3. Make the new scripts executable and run the complete release gate:

```bash
chmod +x release-check
chmod +x scripts/tournament_pipeline.py
chmod +x scripts/sync-tournament-data.py
chmod +x scripts/test-tournament-pipeline.py
chmod +x scripts/validate-tournament-data.py
./release-check
```

Expected new results include:

```text
TOURNAMENT PIPELINE TESTS PASSED
TOURNAMENT DATA VALIDATION PASSED
 - 5 tournament events and 48 source divisions are registered
 - 23 Junior Olympics divisions are enabled for automated raw/normalized snapshots
 - 1 banked dataset(s) currently contain 192 normalized games

CPI release check passed.
```

The existing 545 legacy blockers remain expected in migration mode. The release must show `New blockers: 0`.

4. Review, commit, and push:

```bash
git status
git diff --stat
git add -A
git commit -m "Add normalized tournament data foundation"
git push
```

5. In GitHub, open **Actions → Sync tournament data**. The workflow can be run manually immediately; it will also run every six hours. It commits only source tabs whose CSV contents changed.

The Boys and Girls JO pages continue loading live Google Sheet changes directly every two minutes. The new scheduled workflow banks durable copies for future results history and ranking evidence.
