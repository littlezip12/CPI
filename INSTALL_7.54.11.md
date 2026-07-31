# Install WPI 7.54.11

Install this cumulative patch over the committed WPI 7.54.10 repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.11-GIRLS-FUTURES-SUPER-FINALS*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.11 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Do not commit unless the final line is exactly:

```text
CPI release check passed.
```

Recommended GitHub Desktop commit message:

```text
WPI 7.54.11 — add Girls Futures Super Finals archive
```
