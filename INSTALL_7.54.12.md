# WPI 7.54.12 — Homepage Simplification

Install over the committed WPI 7.54.11 repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.12-HOMEPAGE-SIMPLIFICATION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.12 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Commit only after `CPI release check passed.`
