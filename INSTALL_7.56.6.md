# Install WPI 7.56.6

1. Apply the release ZIP to the clean pushed WPI 7.56.5 repository.
2. Run the six focused 7.56.6 tests.
3. Run `./release-check`.
4. Restore incidental generated tournament and QA output files.
5. Commit and push through GitHub Desktop.
6. Run only the new Supabase migration in SQL Editor.
7. Enable **Allow anonymous sign-ins** in Supabase Authentication.
8. Redeploy `groupme-post`.
9. Validate Owner/Admin transfer, QR guest acceptance, old-device read-only behavior, guest play delivery, and Admin takeover.

Do not rerun the full setup SQL, recreate the GroupMe bot, reset secrets, or alter rankings/tournament data.
