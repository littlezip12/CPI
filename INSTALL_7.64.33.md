# Install — WPI 7.64.33

## Summary
WPI 7.64.33 changes permanent supporter authentication from forced passwordless Magic Link to email/password sign-up and login, while retaining a one-time email link as a secondary existing-account option.

## Changes
- Team-follow onboarding now exposes **Sign up** and **Already a member? Log in**.
- New supporter accounts use email + password and retain initial email verification when Supabase Confirm Email is enabled.
- Returning members use email + password.
- Existing Supabase session persistence remains enabled, so valid sessions survive normal reload/app relaunch.
- Magic Link remains secondary and uses `shouldCreateUser: false`.
- Forgot Password remains available.
- Follow-team target is preserved across browser and native auth returns.
- Native signup verification can use `waterpolohq://auth/callback` through the existing native auth bridge.
- Old native-auth validators are successor-aware rather than forcing the active page back to 7.64.27.
- No Supabase migration or Edge Function deployment is required.

## Run
```bash
./release-check-live-7.64.33
```

After the gate passes, validate on a real browser/iPhone before push:
1. New account via team QR/follow route.
2. Verify email if prompted.
3. Confirm return to intended My Teams/follow target.
4. Sign out and log back in with email/password.
5. Relaunch and confirm the session persists.
6. Test secondary one-time sign-in link with an existing account.

## 7.64.33 account-entry correction
- The normal login page now always shows **Log in** and **Create account** as a two-option toggle.
- Creating an account does **not** grant team, scorer, admin, or club authority; existing invitation/onboarding authorization remains unchanged.

## Cache-bust correction
The public login page now loads `js/live-login-v7-64-33-1.js?v=7.64.33.1` so browsers/CDN caches cannot reuse the earlier 7.64.33 runtime that hid **Create account** after page load. The underlying auth behavior is unchanged; this is an asset-identity correction.
