# Install WPI 7.55.2

1. Apply the cumulative ZIP over the committed WPI 7.55.1 baseline.
2. Run `./release-check`.
3. Commit only after the exact final line `CPI release check passed.`
4. Open `live-sandbox.html` to test the local demo workflow.
5. Do not add Supabase or GroupMe secrets to GitHub.

This release does not require a second repository, a second Terminal application, or a local Supabase installation. A separate team-owned Supabase project will be connected in the next release.
