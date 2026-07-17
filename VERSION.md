# CPI 7.48.3

Historical archive scope validation hotfix.

- Keeps JO identity cleanup checks scoped to the 23 Junior Olympics datasets.
- Compares JO source health only with live sync-enabled datasets.
- Compares JO performance only with Junior Olympics final games.
- Allows historical archive games and completed scores to coexist in the shared normalized manifest.
- Does not change schedules, scores, identities, rankings, or archive evidence policy.
