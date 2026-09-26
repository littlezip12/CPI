# WPI 7.64.30 — iOS Device Readiness & Game-Day Freeze Handoff

Built from the authoritative pushed WPI 7.64.29 ZIP `CPI-main - 2026-09-25T212138.883.zip`.

## Why this release
The next live games are September 26, so app development continues only in non-scoring surfaces. The production scorer/backend/Quick Time/GroupMe runtime is frozen byte-for-byte while physical-iPhone/TestFlight setup is prepared.

## Native readiness added
- iOS source/project diagnostic via `npm run mobile:doctor:ios`
- combined toolchain + project preflight via `npm run mobile:preflight:ios`
- checks app name, bundle ID alignment, signing mode, version/build, URL scheme, and 1024x1024 App Store icon
- surfaces manual Apple Development Team and permanent bundle-ID decisions without guessing them

## Game-day regression hardening
- hashes validated scoring-critical files so app work cannot silently alter them
- 7.64.8 Quick Time, 7.64.9 simplified mobile scoring, and 7.64.11 Game-Day Accuracy/Final Whistle tests now accept successor releases semantically instead of failing at 7.64.20+
- no scoring JavaScript, backend runtime, connected config, SQL migration, or Edge Function source changed

## Next
After the September 26 games, review real scoring feedback before changing any scorer/time/event behavior. Native work can then continue into physical-device install/signing and TestFlight preparation.
