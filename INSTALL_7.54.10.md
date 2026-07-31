# Install WPI 7.54.10

From the local CPI repository:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.10-KAP7-LOGO-IDENTITY-COMPLETION*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.10 patch was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Commit only after the final line is exactly `CPI release check passed.`
