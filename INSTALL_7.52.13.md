# WPI 7.52.13 — Kern Premier and SKIP Ranking Separation

Install this patch over WPI 7.52.12.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.52.13-KERN-PREMIER-SKIP-RANKING-SEPARATION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.52.13 patch was not found in Downloads."
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
