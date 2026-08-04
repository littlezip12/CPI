# Install WPI 7.55.1

This cumulative patch installs over the committed WPI 7.55.0 repository.

It freezes the 2025–2026 Final Rankings as immutable season assets and adds the 2026–2027 active-season foundation across Rankings, Teams, Clubs, profiles, and Tournament history.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.55.1-FINAL-RANKINGS-MULTI-SEASON-FOUNDATION*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.55.1 patch was not found in Downloads."
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
    echo "WPI 7.55.1 validated. Generated operational refreshes were removed."
  else
    echo "ERROR: Release check did not pass. Do not commit."
    exit "$CHECK_STATUS"
  fi
fi
```

Commit only after the exact final line:

```text
CPI release check passed.
```

Commit message:

```text
WPI 7.55.1 — freeze final rankings and add season architecture
```
