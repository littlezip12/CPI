# CPI 7.50.1

Logo restoration and asset normalization first pass.

- Restores the first pass of missing club logos across rankings, club pages, team pages, and club directory views.
- Converts supplied club artwork into canonical WebP files under `assets/logos/canonical/`.
- Preserves transparent backgrounds, trims excess whitespace, and normalizes each logo onto a consistent square canvas.
- Shares confirmed artwork across related club identities: Foothill/FCWP, Clovis/Clovis Red, and Route 66/Route 66 Aquatics.
- Uses the confirmed Newport Harbor artwork for Newport Beach.
- Leaves Junior Olympics applications, tournament data, live refreshes, and sync workflows untouched.
