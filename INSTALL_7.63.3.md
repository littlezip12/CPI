# Install WPI 7.63.3 — Player Analytics & Supporter Recap Simplification

Authoritative base: pushed WPI 7.63.2.

## What changes
- Free Supporter recaps keep the score/period recap and one Team Insights upgrade CTA, but no longer render locked Lineups, Player Stats, or Complete Timeline panels.
- Detailed users keep those private game panels.
- Team Insights adds player analytics at Season, Tournament/Weekend, and Game scope.
- One primary player can be compared with up to three teammates.
- Comparison includes goals, shots, field shooting %, per-game production, assists, saves, steals, turnovers, blocks, exclusions, 5m events, shot outcomes, and shootout results.
- Field shooting % is derived from canonical active WPI Live events; shootouts are separate.
- Pricing remains preview-only at $5/month or $50/year.

## Supabase
Run migration:
`supabase/migrations/202608170004_player_analytics_comparison.sql`

No Edge Function redeploys. No new secrets. No Stripe activation. No infrastructure tier upgrade.

## Validation
Run focused gate first:
`./release-check-live-7.63.3`

Then run:
`./release-check-clean`

Expected final messages:
- `WPI Live 7.63.3 focused release check passed.`
- `CPI release check passed.`
