# Install — WPI 7.64.30 iOS Physical Device Readiness & Game-Day Freeze Guard

## Scope
This release deliberately does **not** change the live scorer, Quick Time behavior, connected backend, Supabase schema, or GroupMe Final Whistle function. It adds native iOS readiness diagnostics and locks the validated game-day runtime by hash while app development continues.

## Game-day protection
The release check fingerprints these operational files from pushed 7.64.29:
- `live-game.html`
- `js/live-backend-v7-64-11.js`
- `js/live-game-v7-64-11.js`
- `js/live-quick-time-pad-v7-64-11.js`
- `config/live-sandbox.js`
- `supabase/functions/groupme-post-v7-64-11/index.ts`

It also runs the 7.64.8 Quick Time, 7.64.9 mobile scoring, and 7.64.11 Game-Day Accuracy/Final Whistle regression checks after removing their stale release-number allowlists.

## Validate
```bash
./release-check-live-7.64.30
npm run mobile:preflight:ios
```

## Physical iPhone / TestFlight gates
The project is configured for automatic signing, Water Polo HQ app identity, the 1024px App Store icon, and `waterpolohq://` callback routing. Before installing on a physical iPhone or creating the first TestFlight archive:
1. Open the iOS workspace in Xcode.
2. Select the **App** target → **Signing & Capabilities**.
3. Choose the Apple Developer Team.
4. Confirm `com.waterpolohq.app` is the permanent bundle identifier and is available in that team.
5. Keep Universal Links deferred until the final production WPHQ domain is ready.

No Supabase migration or Edge Function deployment is required.
