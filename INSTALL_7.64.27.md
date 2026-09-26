# Install — WPI 7.64.27

## Summary
WPI 7.64.27 polishes Water Polo HQ native authentication and adds regression protection for server-backed My Teams follow persistence.

## Changes
- Replaces remaining user-facing WPI/WPI Live wording in the active supporter sign-in flow with Water Polo HQ.
- Converts raw Supabase auth failures (rate limit, expired link, CAPTCHA/network failures) into user-friendly messages.
- Updates active My Teams copy to Water Polo HQ language.
- Confirms successful follows are saved to the user's Water Polo HQ account.
- Adds a release gate proving follow ownership is server-backed and restored from Supabase after session restoration/app relaunch.
- Preserves the 7.64.26 `waterpolohq://auth/callback` native authentication bridge.
- No Supabase migration or Edge Function deployment required.

## Run
```bash
./release-check-live-7.64.27
npm run mobile:sync
npm run mobile:open:ios
```
