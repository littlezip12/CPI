# WPI 7.63.1 — Supporter Analytics Privacy Correction

## Purpose
Correct the 7.63.0 analytics privacy boundary so the `viewer` / Supporter role does not receive detailed player analytics merely because it is a team-member row.

## Access rule after this release
- Owner / Admin / Scorer: detailed operational recap and analytics access.
- Viewer / Supporter: final score, game context and period progression only.
- Viewer / Supporter + Team Insights entitlement: detailed team analytics access.
- Viewer / Supporter + Organization Insights entitlement: detailed organization/team analytics access within scope.
- Platform Owner: existing platform analytics entitlement remains unchanged.

## Database correction
Migration: `supabase/migrations/202608170002_supporter_analytics_privacy_correction.sql`

The migration:
1. Replaces direct `live_events`, `live_lineups`, and `live_game_recaps` SELECT policies so only Owner/Admin/Scorer operational roles can read those rows directly.
2. Corrects `live_game_analytics_detail_v1` so a Viewer/Supporter requires an explicit analytics entitlement.
3. Corrects `live_game_recap_detail_v1` so Viewer/Supporter receives the free recap response unless explicitly entitled.

## No redeploys / secrets
- No Edge Function redeploy.
- No new secrets.
- No scoring-engine changes.
- No GroupMe changes.
- No ad rendering or billing changes.
- No scale-tier purchase required.
