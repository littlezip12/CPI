# WPI 7.54.14 — Team Directory Curation

Install over the committed WPI 7.54.13 repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.14-TEAM-DIRECTORY-CURATION*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.14 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check

  CHECK_LOG="$(mktemp)"
  bash -o pipefail -c './release-check | tee "$1"' _ "$CHECK_LOG"
  CHECK_STATUS=$?

  if [ "$CHECK_STATUS" -eq 0 ] && grep -q '^CPI release check passed\.$' "$CHECK_LOG"; then
    git restore -- \
      data/tournaments/archive/2026-girls-futures-super-finals.json \
      data/tournaments/health \
      data/tournaments/jo-performance \
      data/tournaments/operations \
      data/tournaments/post-jo-review \
      data/tournaments/qa/sync-archive-latest.json \
      qa/jo-performance-engine-7.45.0.json \
      qa/post-jo-review-7.46.0.json \
      qa/release-audit-latest.json 2>/dev/null || true
    find scripts -type d -name "__pycache__" -prune -exec rm -rf {} +
    echo "WPI 7.54.14 validated. Generated operational refreshes were removed."
  else
    echo "ERROR: Release check did not pass. Do not commit."
    exit "$CHECK_STATUS"
  fi
fi
```

Commit only after the output includes the exact line `CPI release check passed.`
Do not click **Pull Origin** before committing the validated local changes.
