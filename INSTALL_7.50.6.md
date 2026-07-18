# Install CPI 7.50.6 — JO Verified Route Metadata Preservation

This focused patch updates the Boys and Girls JO viewer code and validation only. It does not include generated tournament data, rankings, logos, or workflows.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.50.6-JO-VERIFIED-ROUTE-METADATA-PRESERVATION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: CPI 7.50.6 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  ./release-check
fi
```

Do not commit or push unless the final line says `CPI release check passed.`
