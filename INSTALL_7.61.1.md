# Install WPI 7.61.1 — High School Schedule → Game-Day Integration & Optional Delivery

Authoritative baseline: pushed WPI 7.61.0 ZIP `CPI-main - 2026-08-16T132211.051.zip`.

## What changes

- Promotes the four user-supplied Acalanes/Campolindo varsity schedules into source-backed WPI Live Game-Day records.
- Adds first-class `regular_season` games and a permanent `Regular Season` season-series.
- Keeps Miramonte and all JV schedules unpublished until a real source is provided.
- Keeps five TBA-time source rows source-only until an actual start time is published.
- Adds explicit per-team score delivery: **WPI Live only** or **WPI Live + GroupMe**.
- WPI Live-only counts as launch-ready; GroupMe is optional.
- Existing enabled + tested GroupMe teams are preserved as WPI Live + GroupMe.

## Database

Run `supabase/migrations/202608160003_high_school_schedule_optional_delivery.sql` once in Supabase SQL Editor.

No Edge Function redeploy. No new secret.

## Validation

Run `./release-check-live-7.61.1`, then `./release-check-clean`.
