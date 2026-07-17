# CPI 7.48.3 — Historical Archive Scope Validation Hotfix

Merge this patch into the root of the existing CPI repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
ditto -x -k "$HOME/Downloads/CPI-7.48.3-HISTORICAL-ARCHIVE-SCOPE-VALIDATION-HOTFIX.zip" .
chmod +x release-check
./release-check
```

Expected result: `CPI release check passed.`

Then commit and push:

```bash
git status --short
git add -A
git commit -m "Scope JO validators around historical archive data"
```
