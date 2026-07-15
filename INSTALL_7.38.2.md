# Install CPI 7.38.2

This is an incremental patch for a repository that already contains CPI 7.38.1.

1. Unzip this package.
2. Copy its contents into the root of the existing `CPI` repository.
3. Allow the files to replace the 7.38.1 versions.
4. Run `python3 scripts/validate-jo-release.py` if Python and Node are installed.
5. Commit and push.
6. After GitHub Pages deploys, hard-refresh both JO pages once.

Suggested commit:

```bash
git add .
git commit -m "Display JO division seeds separately from team names"
git push
```

## Data behavior

A source value such as `18 - Lamorinda` is parsed into two separate values:

- Team identity: `Lamorinda`
- JO division seed: `18`

The seed appears visually as `#18`, but dropdown values, team URLs, searches, pathway logic, and future ranking data continue using only `Lamorinda`. Both applications remain connected to the live public Google Sheets and refresh every two minutes.
