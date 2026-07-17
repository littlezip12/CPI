# Install CPI 7.46.0

Use Terminal so the hidden GitHub workflow is included.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.46.0-POST-JO-REVIEW-DECISIONS-PATCH*.zip' -print -quit)"

echo "$PATCH"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"

find . -name '.DS_Store' -delete
find . -name '*.textClipping' -delete

chmod +x release-check
chmod +x scripts/build-post-jo-review.py
chmod +x scripts/test-post-jo-review-engine.py
chmod +x scripts/validate-post-jo-review.py
chmod +x scripts/validate-ranking-change-set.py

./release-check
```

Expected new validation sections:

- `POST-JO REVIEW PACKET BUILD COMPLETE`
- `POST-JO REVIEW ENGINE TESTS PASSED`
- `POST-JO REVIEW VALIDATION PASSED`
- `RANKING CHANGE SET VALIDATION PASSED`
- `POST-JO REVIEW UI TESTS PASSED`
- `CPI release check passed.`

Commit message:

```bash
git status --short
git add -A
git commit -m "Add controlled post-JO ranking decisions"
```

Push through GitHub Desktop.

The review page is `post-jo-review.html`. Reviewer decisions are stored only in that browser until explicitly exported. This release does not publish ranking changes automatically.
