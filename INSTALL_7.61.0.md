# WPI 7.61.0 — High School Water Polo Foundation

## Install
1. Apply the patch ZIP over the pushed WPI 7.60.3 repository.
2. Run `./release-check-live-7.61.0`.
3. Apply `supabase/migrations/202608160001_high_school_water_polo_foundation.sql` in Supabase SQL Editor.
4. Run `./release-check-clean`.
5. Commit/push only after both gates pass.

No Edge Function redeploy and no new secret.

## Scope
- Adds `organization_type` (`club` or `high_school`) to WPI Live organizations.
- Seeds Acalanes, Campolindo, Miramonte as High School organizations.
- Seeds four teams per school: Men's Varsity/JV and Women's Varsity/JV.
- Adds school-specific game-page themes using supplied logos/colors.
- Publishes only the four supplied varsity schedules (42 games total).
- Miramonte and every JV schedule remain unpublished until a real source exists.
- Adds a dedicated High School schedule viewer and a Clubs/High Schools organization filter to Supporter discovery.
