# WPI 7.57.16 — Tournament & Weekend Record Experience

## Purpose

This release turns the 7.57.15 durable series model into a season-aware historical record experience and formalizes operational account signup records.

### Tournament / weekend records

- Archive is grouped by competitive season.
- Each tournament or Scrimmage Weekend shows its date range, W-L-T record, final-game count, venues and completed games.
- Completed game rows show team/opponent logos, final score, date/time, venue, official division/stage/game number when available, and a link to the completed game/recap.
- Supporters can read the archive without seeing team-administration controls.
- Game-Day Hub remains the only Owner/Admin game-creation surface.

### Signup/account data

WPI already used Supabase Auth plus `live_profiles` to retain account email and display name. 7.57.16 adds a durable operational registry in `public.live_account_registry` so account records are explicit and queryable for product operations.

Stored fields:

- `user_id`
- `email`
- `display_name`
- `signup_source` (`owner_bootstrap`, `team_invite`, `legacy`, `unknown`)
- `initial_team_id`
- `initial_invite_id`
- `registered_at`
- `email_confirmed_at`
- `last_sign_in_at`
- `updated_at`

No password, auth token, GroupMe credential, OpenAI key, or other secret is stored in this table.

The table has Row Level Security enabled and intentionally has no broad authenticated read policy. The Supabase project owner can inspect it in the SQL Editor/Table Editor. This is operational account data; creating an account does not opt someone into marketing.

Useful Supabase SQL Editor query:

```sql
select
  display_name,
  email,
  signup_source,
  registered_at,
  email_confirmed_at,
  last_sign_in_at
from public.live_account_registry
order by registered_at desc;
```

## Required deployment step

Apply:

`supabase/migrations/202608090005_tournament_weekend_record_experience_signup_registry.sql`

No Edge Function redeploy and no secret changes are required.
