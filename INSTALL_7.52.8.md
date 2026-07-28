# WPI 7.52.8 — JO Logo Identity Resolution

This patch is installed over the committed 7.52.7 repository.

It centralizes JO logo matching in `js/cpi-identity.js`, so the homepage result preview, complete JO results browser, and Boys/Girls selected-team journeys use the same approved identity logic.

No ranking, score, record, final placement, bracket path, or tournament source data is changed.

## Terminal install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.52.8-JO-LOGO-IDENTITY-RESOLUTION*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: CPI 7.52.8 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  ./release-check
fi
```

Only commit when the final line is exactly:

```text
CPI release check passed.
```

Suggested GitHub Desktop commit message:

```text
CPI 7.52.8 — unify JO logo identity resolution
```
