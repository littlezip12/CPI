# Install CPI 7.50.4 — JO Journey Resolution & Performance

This patch updates both Junior Olympics schedule viewers. It does not include generated tournament data, live-result snapshots, ranking data, or canonical logo assets.

## Install

Leave the downloaded ZIP in your Downloads folder, then run:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.50.4-JO-JOURNEY-RESOLUTION-PERFORMANCE*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: CPI 7.50.4 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  ./release-check
fi
```

Do not commit or push unless the final line says:

```text
CPI release check passed.
```

## Primary regression checks

- A verified or cached schedule renders while the live Google check runs.
- `W10-LAMORINDA A` resolves into Game 34 after Game 10 is final.
- Winner and loser routes continue into later bracket and pool games.
- Published rankings remain unchanged.
