# Install WPI 7.64.7 — Champions Cup Qualifier Registry

1. Apply `WPI_7.64.7_CHAMPIONS_CUP_QUALIFIER_REGISTRY_PATCH.zip` at the repository root.
2. Run `./release-check-live-7.64.7`.
3. Run `./release-check-clean`.
4. If the full gate ends with `CPI release check passed.`, commit and push with GitHub Desktop.
5. Validate the live Tournament Hub and `champions-cup-qualifiers.html` after GitHub Pages deploys.

No Supabase migration, Edge Function deployment, secret, billing, or infrastructure change is required for this release. The Lamorinda Champions Cup Pacific Zone Qualifier series already exists in production and remains unchanged.
