# WPI 7.52.9 — JO Logo Delivery Wiring

Install this patch over committed release 7.52.8.

## What this fixes

- Loads `js/cpi-identity.js` before the homepage JO preview and full tournament-results browser.
- Refreshes the identity resolver and JO application cache keys on Boys and Girls journey pages.
- Adds verified source-name aliases for existing club artwork.
- Preserves rankings, scores, records, placements, division routing, and tournament paths.

## Terminal installation

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.52.9-JO-LOGO-DELIVERY-WIRING*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: CPI 7.52.9 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Commit only when the final line is exactly:

`CPI release check passed.`

Suggested commit message:

`CPI 7.52.9 — wire JO logo resolver into results`
