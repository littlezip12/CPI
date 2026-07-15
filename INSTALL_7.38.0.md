# Install CPI 7.38.0

## Recommended deployment for this release

Use the patch package over the current GitHub repository. The source ZIP supplied for this build did not contain the existing canonical club-logo library, so do not delete the current repository contents before applying this release.

1. Make a backup or commit the current repository state.
2. Copy the patch contents into the repository root, preserving folders.
3. Run:

```bash
python3 scripts/validate-jo-release.py
```

4. Commit every added and changed file:

```bash
git add -A
git commit -m "Release 7.38.0 Junior Olympics Weekend 2 schedule"
git push
```

5. After GitHub Pages deploys, test:

- `/CPI/tournaments/jo-boys/`
- 10U Championship
- One D1, D2, and D3 division at each available age
- A team selection and its win/loss pathway
- The official division-sheet link
- `/CPI/tournaments/jo-girls/`
- Homepage and tournament-hub links

## Expected behavior

The tool reads the official Google workbook in the browser. It tries CSV export first, then Google Visualization JSONP, and caches the most recent successful division load locally in the visitor's browser.

## Current limitation

Raw Boys schedule snapshots are not included because the Google Sheet rows could not be downloaded into this build environment. The next architecture release will store source snapshots and generate normalized tournament JSON during the build.
