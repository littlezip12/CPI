# Install WPI 7.54.11 Final Integrity Fix

Install this patch over the repository where the original Girls Futures patch and prior validator fixes have already been applied.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.11-GIRLS-FUTURES-FINAL-INTEGRITY-FIX*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.11 final integrity fix was not found in Downloads."
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

Recommended commit message:

```text
WPI 7.54.11 — finalize Girls Futures archive integrity
```
