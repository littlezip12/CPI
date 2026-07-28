# Install WPI 7.53.0

Install the patch into the existing CPI repository, remove macOS metadata, and run the complete release check.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.53.0-ADAPTIVE-SPONSOR-READY-CLUB-PROFILES*.zip" -print | head -1)"
if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.53.0 patch was not found in Downloads."
else
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```
