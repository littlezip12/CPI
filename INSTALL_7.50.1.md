# Install CPI 7.50.1 — Logo Restoration & Asset Integrity (First Pass)

1. Close GitHub Desktop if it is currently open.
2. Extract this patch directly into the root of your CPI repository.
3. From Terminal:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
find . -name ".DS_Store" -delete
./release-check
```

Expected outcome: the standard release check still passes.

This release is asset-focused. It restores a first pass of canonical club logos and does not change the JO apps, tournament data, sync workflows, or rankings logic.
