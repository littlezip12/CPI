# CPI 7.50.2

Canonical logo delivery hotfix.

- Forces fresh `v=7.50.2` requests for canonical logo assets.
- Prevents cached pre-restoration 404 responses from continuing to display the CPI fallback.
- Adds direct versioned logo URLs to rankings, team profiles, and club intelligence.
- Replaces the blank team-profile logo state with the CPI fallback if an asset genuinely fails.
- Leaves JO applications, tournament data, rankings data, and sync workflows unchanged.
