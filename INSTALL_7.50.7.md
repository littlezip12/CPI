# Install CPI 7.50.7 — JO Assigned Route Label Resolution

This focused patch updates the Boys and Girls JO route parser, cache-busting application version, and validation only. It does not include generated tournament data, rankings, logos, or workflows.

Leave the downloaded ZIP in your Downloads folder, then run:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.50.7-JO-ASSIGNED-ROUTE-LABEL-RESOLUTION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: CPI 7.50.7 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  ./release-check
fi
```

Do not commit or push unless the final line says `CPI release check passed.`
