# WPI 7.63.7 — Promotional Access & Adoption Operations

## Scope
- Platform Owner UI to schedule/edit/pause/reactivate no-card Team Insights previews.
- Preview scope: one team, one organization, or entire WPI platform.
- Optional team tournament/weekend reference for launch context.
- 3 / 7 / 14 day duration shortcuts.
- Existing Team Insights preview banner continues to show the free-through date.
- Access automatically expires from `ends_at`; users return to Free Supporter unless separately entitled.
- No Stripe activation, no payment collection, no Edge Function deploy, no new secret, no infrastructure tier upgrade.

## Supabase migration
`supabase/migrations/202608170010_team_insights_preview_operations.sql`

## Validation
`./release-check-live-7.63.7`
