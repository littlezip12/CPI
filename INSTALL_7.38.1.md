# Install CPI 7.38.1

This is an incremental patch for a repository that already contains CPI 7.38.0.

1. Unzip this package.
2. Copy its contents into the root of the existing `CPI` repository.
3. Allow these files to replace the 7.38.0 versions.
4. Confirm these files exist before committing:
   - `tournaments/jo-girls/index.html`
   - `tournaments/jo-girls/app.js`
   - `tournaments/jo-girls/source-registry.json`
   - `tournaments/jo-boys/index.html`
   - `tournaments/jo-boys/app.js`
5. Run `python3 scripts/validate-jo-release.py` if Python and Node are installed.
6. Commit and push.
7. After GitHub Pages deploys, hard-refresh both JO pages once.

Suggested commit:

```bash
git add .
git commit -m "Fix Girls JO schedule loading and live refresh"
git push
```

## Live-data behavior

Both JO applications request the current public Google Sheet when the page opens, then check again every two minutes. They also refresh when a user returns to the tab or comes back online. The browser stores the last successful response only as an outage fallback; successful live requests replace it.
