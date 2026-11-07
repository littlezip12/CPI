# Water Polo HQ 7.64.48 — Game Experience Foundation

Source: 7.64.47 full repository supplied by the prior release, not a more recent unprovided push. Verify your local Git HEAD before overlaying.

## What ships
- Separate responsive `live-game-experience.html?game=<uuid>` using the existing authenticated, access-controlled `live_game_recap_detail_v1` RPC.
- Score hero, team logos, game status, gamecast, basic recorded-home-team box score, quarter-filtered events, lineup snapshots, team-stats placeholder.
- Read-only **New game view** link added to existing Game Recap; existing recap retained.
- Player names/caps use the existing effective-cap RPC; unknown opponent identity is explicitly labeled unknown. Goal types are not guessed.

## Deliberately deferred
- Postgame opponent roster entry/storage and game-specific mapping.
- 6-on-5, even-strength, counterattack, and penalty classifications until the structured event source supports verified context.
- Complete two-sided box score and team stats.
- Public publishing/access policy changes.

## Safety
No edits to scoring console, writer, guest scorer, Final Whistle, existing DB schema, auth settings, or GroupMe. No Supabase SQL.

## Test
1. Run `./release-check-live-7.64.48`; it runs baseline regression gate plus new foundation checks.
2. Run `npm run mobile:update:ios` (Mac with iOS toolchain).
3. Sign in, open a completed game recap, click `New game view`, switch tabs, inspect quarter filter and rostered player caps.
4. Check that ordinary scoring and guest scoring are unchanged; inspect no live-event write calls in new page.

Do not promote to production without reviewing deployment and live login permissions.
