# Install — WPI 7.64.23

## Purpose
First-run iOS native polish after the successful iPhone 17 / iOS 27 simulator launch.

## Install / sync
```bash
unzip -o ~/Downloads/WPI_7.64.23_IOS_FIRST_RUN_NATIVE_POLISH_PATCH.zip
npm install
./release-check-live-7.64.23
npm run mobile:sync
npm run mobile:open:ios
```

In Xcode, run the existing `App` target in the iPhone Simulator again. Do not run `mobile:add:ios`; the iOS project already exists locally.

## Expected simulator changes
- WPHQ header sits below the iPhone status/Dynamic Island safe area.
- Top navigation uses compact native labels: Home / Rankings / Teams / Events / Live.
- `Install Water Polo HQ` never appears in the native app.
- Signed-out My Teams does not show Sign out, Add another team, Team Dashboard, or Account Security.
- Signed-in users regain those authenticated actions after session validation.

No database migration or Edge Function deployment is required.
