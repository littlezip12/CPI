# Install WPHQ 7.64.41

1. Apply the patch from the authoritative pushed 7.64.40 baseline.
2. Run `./release-check-live-7.64.41`.
3. Open `supabase/migrations/202610010001_security_definer_least_privilege.sql` in TextEdit, copy it into the production Supabase SQL Editor, and run it once.
4. Open `supabase/validation/202610010001_security_definer_least_privilege_check.sql` in TextEdit and run it read-only; confirm the expected 13 / 54 / 10 category counts and zero unexpected anon functions.
5. Run `npm run mobile:update:ios`; validate browser + physical iPhone.
6. If a privilege regression occurs, the emergency rollback is `supabase/rollback/202610010001_security_definer_least_privilege_rollback.sql`.
7. Commit/push only after signed-out public, permanent-account, guest-scorer, Final Whistle, and GroupMe smoke tests pass.

No Edge Function deployment is required.
