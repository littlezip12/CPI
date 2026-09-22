# WPI 7.64.19 — Water Polo HQ Brand System & Release Gate Hardening

## Scope
- Replaces the superseded net-like WPHQ ball artwork with the approved water-polo-ball mark.
- Refreshes header, brand mark, Apple/PWA icons and PWA cache identity.
- Hardens recurring historical release gates so preserved behavior is checked semantically instead of by repeatedly extending site-version allowlists.
- Keeps Water Polo HQ as the consumer brand and Water Polo Index as the rankings methodology.

## Backend impact
None. No Supabase migration, Edge Function deployment, GroupMe secret/config change, scoring contract change, or ranking-data change.

## Install
Unzip the patch into the repository root and run `./release-check-live-7.64.19`, then `./release-check-clean`.
