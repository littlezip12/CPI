# Install WPI 7.55.0

This cumulative patch installs over the committed WPI 7.54.18 repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.55.0-COMPETITIVE-SEASON-TOURNAMENT-HISTORY*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.55.0 patch was not found in Downloads."
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
      data/tournaments/normalized/manifest.json \
      data/tournaments/health \
      data/tournaments/jo-performance \
      data/tournaments/operations \
      data/tournaments/post-jo-review \
      data/tournaments/qa/sync-archive-latest.json \
      qa/jo-performance-engine-7.45.0.json \
      qa/post-jo-review-7.46.0.json \
      qa/release-audit-latest.json 2>/dev/null || true

    find scripts -type d -name "__pycache__" -prune -exec rm -rf {} +
    echo "WPI 7.55.0 validated. Generated operational refreshes were removed."
  else
    echo "ERROR: Release check did not pass. Do not commit."
    exit "$CHECK_STATUS"
  fi
fi
```

Commit message:

```text
WPI 7.55.0 — establish competitive season history
```
