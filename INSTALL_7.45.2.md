# CPI 7.45.2 — Boys JO Browser Parser Alignment

This hotfix aligns the public Boys JO browser parser with the normalized tournament pipeline.

## Fixes

- Selects the authoritative rightmost GMID in each row.
- Prevents stage labels such as `RR9-11` from being mistaken for a game ID.
- Accepts lettered GMIDs such as `10B-140A`.
- Derives a missing visible game number from the GMID.
- Requires browser and normalized game sets to match across all 12 Boys divisions.
- Adds regression coverage for 10U Games 91, 94, 97, and 140A.

Published rankings and normalized tournament data are unchanged.

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.45.2-BOYS-JO-BROWSER-PARSER-HOTFIX*.zip' -print -quit)"

echo "$PATCH"

ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"

chmod +x release-check
chmod +x scripts/test-jo-boys-browser-parser.js

./release-check
```

The release check should include:

```text
BOYS JO BROWSER PARSER TESTS PASSED
 - Browser and normalized game sets match across all 12 Boys divisions
 - Stage labels such as RR9-11 cannot displace the authoritative GMID
 - Games 91, 94, 97, and 140A are retained with correct game numbers

CPI release check passed.
```

## Commit

```bash
git status --short
git add -A
git commit -m "Align Boys JO browser parser with normalized games"
```

Push through GitHub Desktop.
