# Install — WPI 7.64.28 Native Team Link & QR Onboarding

## Summary
7.64.28 lets the Water Polo HQ native app receive team-follow deep links and carry the requested team through the existing My Teams + supporter authentication flow.

## Native team-link contract
- Preferred development/beta link: `waterpolohq://team/<team UUID>`
- Compatibility form: `waterpolohq://follow?team=<team UUID>`
- Native target: `live-following.html?followTeam=<team UUID>&native=1`
- Signed-out flow preserves `followTeam` through supporter magic-link authentication.
- Signed-in flow uses the existing read-only team-follow RPC; it does not grant membership, scoring, roster, GroupMe, Owner/Admin or other operational authority.

## Share Team behavior
- Browser copy link remains the normal `live-following.html?followTeam=<team UUID>` URL.
- Inside the native app, the QR encodes the `waterpolohq://team/<team UUID>` link so a device with Water Polo HQ installed can open the app directly.
- Universal Links/App Links remain deferred until the production Water Polo HQ domain is finalized.

## Install / validate
```bash
./release-check-live-7.64.28
npm run mobile:sync
npm run mobile:open:ios
```

## Simulator deep-link test
With the Water Polo HQ iPhone simulator installed and running, use an active Live team UUID:

```bash
xcrun simctl openurl booted "waterpolohq://team/ef1b5ca5-0841-4626-9491-ea44bea1dc6f"
```

Expected result: Water Polo HQ opens My Teams with the Lamorinda 14U Boys A team target preserved. If signed out, sign-in should preserve the team and add it after authentication. If already signed in, the team is added/read as already present.

No Supabase migration or Edge Function deployment is required.
