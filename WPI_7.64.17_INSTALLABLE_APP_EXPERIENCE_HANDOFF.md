# WPI 7.64.17 — Installable App Experience handoff

## Goal
Give real parent/supporter users an app-like WPI experience now, while keeping one web codebase until native-app demand is proven.

## Included
- `manifest.webmanifest` with standalone launch into My Teams.
- WPI 180/192/512 app icons plus maskable 512 icon.
- `sw-v7-64-17.js` network-first service worker and `offline.html` fallback.
- PWA metadata on primary WPI Live/supporter/game/stats pages.
- Install WPI action on Live and My Teams; iOS Share → Add to Home Screen guidance.
- Deep links are preserved; the service worker never rewrites route/query parameters.

## Safety
- No scoring/backend/GroupMe/analytics logic changes.
- No Supabase migration or Edge Function deployment.
- Supabase/Auth requests remain outside the service worker because they are cross-origin.
- Offline mode is a shell/fallback, not an offline source of truth for scores or stats.
