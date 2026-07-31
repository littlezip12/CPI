# WPI 7.54.11 — Archive Validator Stabilization

This cumulative validator-only patch is installed after the Girls Futures Super Finals release.

It corrects the archive validation failure caused by duplicated hard-coded totals and makes the validators reconcile generated output against the tournament registry while retaining verified regression floors.

Updated safeguards:

- Tournament registry: at least 10 events and 107 divisions
- Completed archive: at least 7 events and 76 divisions
- Operations archive: at least 71 controlled archive divisions
- Archive output counts must exactly reconcile to the archive-enabled registry
- Girls Futures Super Finals must render in the shared archive UI
- Rankings, tournament results, identities, logos, and public presentation data are not changed

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.54.11-GIRLS-FUTURES-ARCHIVE-VALIDATOR-FIX*.zip" -print | head -1)"

if [ -z "$PATCH" ]; then
  echo "ERROR: WPI 7.54.11 archive validator fix was not found in Downloads."
else
  echo "Using: $PATCH"
  ditto -x -k "$PATCH" .
  find . -name ".DS_Store" -delete
  chmod +x release-check
  ./release-check
fi
```

Commit only when the final line is:

```text
CPI release check passed.
```
