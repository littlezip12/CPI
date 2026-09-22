# Water Polo HQ Mobile App Foundation — 7.64.22

Water Polo HQ remains one product and one web codebase. The native apps are thin Capacitor shells around a generated mobile web bundle. Do not fork scoring, analytics, rankings, Supabase, GroupMe, or supporter behavior into separate native implementations.

## Foundation decisions

- Native runtime: Capacitor 8.
- App name: Water Polo HQ.
- Provisional native app ID: `com.waterpolohq.app`.
- Generated native web bundle: `mobile/www` (not committed).
- Native cold start: My Teams (`live-following.html`).
- Public Water Polo HQ home inside the app: `index.html?home=1`.
- Water Polo Index remains the ranking methodology name.
- Universal Links / Android App Links will be configured only after the production WPHQ domain is final.
- Existing Supabase authentication is preserved, but email magic-link return into the native shell must be proven before beta distribution.

## Current toolchain requirements

Capacitor 8 requires Node 22+. iOS builds require macOS, Xcode 26+ and Xcode Command Line Tools. Android builds require Android Studio 2025.2.1+ and an Android SDK (API 24+ supported by Capacitor 8; use a current stable SDK for development).

## Foundation workflow

```bash
npm install
npm run mobile:doctor
npm run mobile:prepare
```

`mobile:prepare` builds a native-safe static snapshot into `mobile/www`. The generated directory is intentionally ignored by Git.

Do not add the native platform projects until the toolchain check passes and the native app ID is confirmed. When ready:

```bash
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
```

After the platform projects exist, the next phase is real-device validation: sign-in, My Teams, team-follow deep links, scoring permissions, live-score viewing, network recovery and app lifecycle behavior.
