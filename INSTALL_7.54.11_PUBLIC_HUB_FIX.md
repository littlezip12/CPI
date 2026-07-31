# WPI 7.54.11 — Girls Futures Public Hub Fix

Install this patch over the repository that already has the WPI 7.54.11 Girls Futures release work.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.11-GIRLS-FUTURES-PUBLIC-HUB-FIX*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.11 public hub fix was not found in Downloads."
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
