# WPI 7.52.16 — Club Website Completion

Install this patch over WPI 7.52.15.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.52.16-CLUB-WEBSITE-COMPLETION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.52.16 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Commit only when the final line is `CPI release check passed.`
