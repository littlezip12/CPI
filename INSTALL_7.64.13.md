# Install WPI 7.64.13 — Team Follow & QR Onboarding

1. Apply the 7.64.13 patch over the pushed 7.64.12 baseline.
2. Run `./release-check-live-7.64.13`.
3. Run `./release-check-clean`.
4. Commit/push through GitHub Desktop after both gates pass.

No Supabase migration or Edge Function deployment is required.

## Live validation

- Open WPI Live → My Teams.
- Confirm **+ Add another team** is visible and the directory does not dump all teams before a search/filter.
- On a team card, select **Share Team** and verify QR + Copy link.
- In Team Dashboard → Team Access, verify **Share team** appears for an Owner/Admin.
- Open the shared link in a private browser: sign in/create a supporter account and confirm the exact team is added to My Teams.
- Confirm the follow relationship remains read-only.
