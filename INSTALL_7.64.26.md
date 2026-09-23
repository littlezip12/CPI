# Install — WPI 7.64.26 Native Authentication Bridge

## Scope
- Registers `waterpolohq://auth/callback` in the iOS project.
- Adds a Capacitor App URL-open bridge to the generated native bundle.
- Uses the native callback for passwordless My Teams sign-in only inside the native shell.
- Preserves the intended My Teams/follow target across the email round-trip.
- Preserves existing web/PWA authentication.
- Normalizes `package.json` / `package-lock.json` to 7.64.26.

## Supabase manual control required before end-to-end native magic-link testing
In Supabase Dashboard → Authentication → URL Configuration, add this exact Additional Redirect URL:

`waterpolohq://auth/callback`

Keep the production HTTPS Site URL unchanged. Universal Links remain deferred until the Water Polo HQ production domain is final.

## Local validation
```bash
npm install
./release-check-live-7.64.26
npm run mobile:sync
npm run mobile:open:ios
```

No migration or Edge Function deployment is required.
