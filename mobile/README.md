# Water Polo HQ Mobile App — Unified Release Contract (7.64.39)

Water Polo HQ is **one product with one repository-root source**. The web product and the native iOS/Android shells must not fork into separate scoring, analytics, rankings, authentication, Supabase, GroupMe, supporter, or tournament implementations.

The native apps are thin Capacitor 8 shells around a generated copy of the same repository-root web runtime. `mobile/www` is generated and intentionally not committed. The iOS generated `ios/App/App/public` payload is also ignored by Git.

## Release rule

Every WPHQ product release updates the web source first. The mobile bundle is then regenerated from that **same repository-root source**, so there is no second mobile feature implementation to maintain.

`npm run mobile:prepare` now:

- reads the current release from `config/site-release.json`;
- copies the current runtime into `mobile/www`;
- injects the native shell/auth/team-link bridge;
- injects the exact WPHQ source release into every generated HTML page;
- writes `mobile/www/wphq-native-release.json` for traceability;
- preserves the existing My Teams native cold start and native-safe PWA behavior.

`npm run mobile:verify` rebuilds and checks that the generated native bundle matches the current web release and that key runtime assets are byte-identical to the web source.

## One-command iOS refresh

After a WPHQ release is installed/validated locally, run:

```bash
npm run mobile:update:ios
```

That performs:

1. mobile/Xcode toolchain preflight;
2. current mobile bundle generation;
3. `npx cap sync ios`;
4. web/native parity verification;
5. opens the iOS project in Xcode.

From Xcode, Run installs the refreshed build on the selected simulator or signed physical iPhone.

## What updates together vs. separately

**Updates together:** product source, scoring, analytics, Team Insights, supporter UX, auth pages, tournament views, branding, CSS/JS, and other runtime web assets. They all come from the same WPHQ release and are rebuilt into the native shell.

**Separate delivery step:** an already-installed native app does not receive a new embedded bundle merely because GitHub/web production changed. A refreshed iPhone build must still be installed from Xcode, or a new **TestFlight/App Store binary** must be archived/uploaded when distributing to other users.

This is deliberate: one codebase, one release identity, two delivery channels.

## Current native contract

- Runtime: Capacitor 8.
- App name: Water Polo HQ.
- App ID: `com.waterpolohq.app` (still provisional until App Store identity is locked).
- Generated web bundle: `mobile/www`.
- Native cold start: `live-following.html` (My Teams).
- Public WPHQ home inside the app: `index.html?home=1`.
- Auth callback: `waterpolohq://auth/callback`.
- Team deep link: `waterpolohq://team/<team UUID>`.
- Universal Links / Android App Links remain deferred until the production WPHQ domain is final.

## Normal developer flow

```bash
npm install
./release-check-live-<CURRENT_RELEASE>
npm run mobile:update:ios
```

Once TestFlight is in use, archive/upload the iOS binary from the same committed WPHQ release after its native smoke test. Build numbers must increment for each TestFlight upload even when the marketing version remains unchanged.

## 7.64.40 release-gate sequencing

The ordinary release gate validates repository-root source and the generated `mobile/www` bundle. It does not fail solely because a previously synced `ios/App/App/public` payload is stale.

Use `npm run mobile:update:ios` for a device/Xcode refresh. That command performs the iOS sync and then runs strict parity verification (`--require-ios`) before opening Xcode. This avoids the pre-sync chicken-and-egg failure while still preventing a stale bundle from being installed or archived.
