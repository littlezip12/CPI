# Water Polo HQ — 7.64.43 Coach Full-Roster Stats + ECC/Security Merge Handoff

**Date:** October 4, 2026

## Why 7.64.43

Two chats advanced WPHQ in parallel using overlapping release numbers. The actually pushed security stream reached 7.64.41, while the parallel ECC stream completed 7.64.42 Google live results and Team Journey history. 7.64.43 is the first explicit convergence release and should become the single forward baseline.

## Preserved from 7.64.41 security

- SECURITY DEFINER classification remains 13 public / 54 authenticated / 10 internal trigger functions.
- migration, validation, rollback, and classification manifest remain in the repo.
- guest scorers remain supported through Supabase anonymous Auth's `authenticated` database role.
- no security rollback is performed by 7.64.43.

## Restored from the parallel 7.64.42 ECC stream

- official public Google workbook / `MASTER BY DIVISION` read-only source;
- 60-second Google GViz refresh;
- 335 stable WPHQ ECC game IDs across 13 divisions;
- `10CPTAG` → `10CPT` game-ID normalization;
- current team and score overlay;
- existing JO-style route resolution;
- Team Journey `Games played` history plus `Next scheduled game`;
- repository event JSON remains fallback;
- abandoned OneDrive/Selenium automation remains excluded.

The merged release keeps the verified schedule baseline marker at 7.64.36 and the ECC feature markers at 7.64.42 rather than pretending those features were authored in 7.64.43.

The 7.64.43 release gate intentionally does **not** call the old 7.64.36 full ECC gate. That historical gate required exactly 13 CSV files in the ECC source folder, while the legitimate 7.64.42 Google work adds a 14th CSV regression fixture. 7.64.43 validates the 13 original schedule exports plus the separate Google fixture explicitly, eliminating that false failure without weakening the ECC checks.

## New in 7.64.43 — Coach Report

Team Insights → Player Stats still supports an interactive comparison of up to four players. That limit is useful for visual comparison and is intentionally unchanged.

A separate **Coach Report** now uses the full `live_team_player_insights_v2` response for the selected scope and therefore includes **every rostered player**.

Supported scopes:

- Season
- Event / tournament / weekend
- Game

The report includes:

- games played
- goals
- assists
- shots
- shooting percentage
- saved / blocked / post / missed shot outcomes
- goalie saves
- field blocks
- steals
- turnovers
- exclusions drawn / committed
- 5m drawn / committed
- shootout goals / misses

Output options:

- full on-screen roster table;
- **Copy report** as tab-separated text for email, text, GroupMe, Notes, or spreadsheets;
- **Download CSV** for a clean coach-facing file.

The report is alphabetized by player name for stable, coach-friendly output. DNP/participation logic and player identity remain sourced from the existing v2 analytics RPC; no new database function is needed.

## Native/mobile

`mobile:verify` now targets 7.64.43 and proves the new Team Insights Coach Report plus merged ECC/security assets are copied into the generated Capacitor bundle. `npm run mobile:update:ios` remains the normal iPhone update flow.

## Supabase

No new migration is required for 7.64.43. Production should retain the already-run 7.64.41 migration.
