# CPI 7.48.0 Installation

## Purpose

This release adds controlled archival banking for three completed 2026 tournaments while preserving separate live operations for both Junior Olympics weekends.

## Install

From Terminal:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.48.0-HISTORICAL-TOURNAMENT-ARCHIVE-PATCH*.zip' -print -quit)"
echo "$PATCH"
ditto -x -k "$PATCH" .
chmod +x release-check
chmod +x scripts/build-tournament-archive.py
chmod +x scripts/test-historical-tournament-parser.py
chmod +x scripts/validate-tournament-archive.py
./release-check
```

The complete release check should end with `CPI release check passed.`

## Commit

```bash
git status --short
git add -A
git commit -m "Add controlled historical tournament archive"
```

Push through GitHub Desktop.

## First archive run

After the push, open GitHub Actions and manually run **Sync historical tournament archive**. The workflow will attempt all 25 completed-event divisions. A division remains honestly marked `Archive pending` if its public source cannot be fetched or parsed; it is never filled with invented data.

Historical data remains excluded from ranking evidence until a later explicit approval release.
