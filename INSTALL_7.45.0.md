# Install CPI 7.45.0

Use Terminal so the hidden GitHub Actions workflow is included.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.45.0-JO-LIVE-RESULTS-PERFORMANCE-PATCH*.zip' -print -quit)"

echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"

chmod +x release-check
chmod +x scripts/build-jo-performance.py
chmod +x scripts/test-jo-performance-engine.py
chmod +x scripts/validate-jo-performance-engine.py

./release-check
```

Expected new validation sections:

```text
JO PERFORMANCE ENGINE BUILD COMPLETE
JO PERFORMANCE ENGINE TESTS PASSED
JO PERFORMANCE ENGINE VALIDATION PASSED
JO PERFORMANCE UI TESTS PASSED
RANKING REVIEW ENGINE VALIDATION PASSED
CPI release check passed.
```

Commit:

```bash
git status --short
git add -A
git commit -m "Add JO live results and performance engine"
```

Push through GitHub Desktop.
