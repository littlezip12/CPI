# WPI 7.64.34 — Organization Insights Identity & Team-Scoped Season Stats Handoff

## Why this release exists
Production Organization Insights grouped `player_totals` by the concrete database `live_players.id`. Because each immutable roster version receives a new database player UUID, the same child could appear multiple times across BAWPL, Champions Cup, or other roster versions even though `client_player_id` remained stable.

Production inspection confirmed this pattern for Lamorinda 14U Boys A: the same stable `client_player_id` exists across several roster versions with different `live_players.id` values. Finalized analytics rows therefore need identity resolution before season aggregation.

## 7.64.34 contract
- Organization player identity = stable `client_player_id` when available; raw player UUID is fallback only.
- Aggregation key = **team_id + stable player identity + selected season**.
- Multiple tournaments/weekends and roster versions for the same team accumulate into one season row.
- The same child on A and B remains separate because team_id remains part of the key.
- Latest roster-version display name is used for presentation.
- Cap number is game-day context, not analytics identity, and is not shown in Organization Insights.
- Only current finalized game analytics contribute, preserving prior Organization Insights semantics.

## Technical changes
- New migration: `202609270001_organization_insights_stable_identity_team_season.sql`.
- New RPC: `live_organization_insights_overview_v2(uuid,text)`.
- New UI runtime: `js/live-organization-insights-v7-64-34.js`.
- New stylesheet: `css/live-organization-insights-v7-64-34.css`.
- Organization Insights page now uses the v2 RPC and groups season player totals under each team.
- No Edge Function deployment.
- No scorer, GroupMe, Final Whistle, handoff, auth, or follow behavior changed.

## Production sequencing
1. Install patch.
2. Run `./release-check-live-7.64.34`.
3. Apply the Supabase migration.
4. Validate Organization Insights with real 2026-2027 data.
5. Push only after validation.
