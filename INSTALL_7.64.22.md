# Install — WPI 7.64.22 WPHQ Mobile App Foundation

## What this release does
- Adds Capacitor 8 project metadata for the future iOS and Android apps.
- Keeps the existing Water Polo HQ web/PWA codebase as the single product source.
- Adds a generated mobile bundle at `mobile/www` (ignored by Git).
- Sets the native cold-start contract to **My Teams** (`live-following.html`).
- Preserves the normal Water Polo HQ Home route as `index.html?home=1` inside the native shell.
- Adds native-safe PWA handling so the installed native shell does not show browser-install prompts or try to register the PWA service worker.
- Adds a mobile toolchain doctor and app contract.
- Does **not** generate `ios/` or `android/` yet.
- Does **not** change Supabase, GroupMe, scoring, analytics, roster logic or tournament data.

## Release validation
```bash
./release-check-live-7.64.22
```

## After this release is pushed
On the Mac that will build iOS:
```bash
node --version
xcodebuild -version
xcode-select -p
npm install
npm run mobile:doctor
npm run mobile:prepare
```

Do not run `npm run mobile:add:ios` or `npm run mobile:add:android` until the app ID is confirmed and the toolchain doctor has been reviewed.
