# Install — WPI 7.64.29 Cross-Device Team QR Fix

## Summary
7.64.29 corrects Share Team QR behavior found during real-device QA. QR codes now always contain a normal public HTTPS team-follow URL, so they are scannable by any phone camera whether or not Water Polo HQ is installed.

## Share Team behavior
- QR payload: `https://littlezip12.github.io/CPI/live-following.html?followTeam=<team UUID>` on native/local builds.
- Copy Team Link uses the same public HTTPS follow contract.
- On an already-deployed HTTPS web host, the share runtime preserves that host/base path.
- `waterpolohq://team/<team UUID>` remains supported for installed-app/development deep-link tests, but is no longer encoded into the QR.
- Universal Links/App Links remain deferred until the production Water Polo HQ domain is finalized.

## Install / validate
```bash
./release-check-live-7.64.29
npm run mobile:sync
npm run mobile:open:ios
```

## Real-device QR test
1. Open Water Polo HQ in the iPhone Simulator.
2. Open **Share Team** for a followed team.
3. Scan the displayed QR with the Camera app on a separate physical iPhone.
4. The phone should recognize an HTTPS URL and offer to open the Water Polo HQ team-follow page in Safari.
5. The page should preserve the exact `followTeam` team UUID through sign-in if required.

No Supabase migration or Edge Function deployment is required.
