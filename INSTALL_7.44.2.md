# CPI 7.44.2 — Boys JO Source Stabilization

This patch repairs all 12 Boys JO divisions together. It uses stable worksheet names first, prior numeric GIDs second, and a verified same-origin snapshot last.

## Install

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.44.2-BOYS-JO-SOURCE-STABILIZATION-PATCH*.zip' -print -quit)"
echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"
chmod +x release-check scripts/validate-jo-boys-source-stability.py
./release-check
```

Expected: `BOYS JO SOURCE STABILITY VALIDATION PASSED` and `CPI release check passed.`
