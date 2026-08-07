# WPI Live Backend Setup — 7.56.8

WPI Live remains a private Supabase-backed scoring workspace with Owner, Admin, Scorer, Viewer, and game-scoped Guest Scorer access.

## Fresh project

Use `supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql` in the Supabase SQL Editor for a new project.

The browser configuration uses only the Supabase **Project URL** and **Publishable key**. Never copy a secret key, service-role key, GroupMe bot ID, GroupMe access token, database password, or JWT into browser files.

## Existing 7.56.7 project

Apply only:

`supabase/migrations/202608070001_groupme_topic_delivery.sql`

Do not rerun the full setup SQL.

## Roles

- **Owner** — team administration, secret-name mapping, destinations, games, invitations, scorer takeover.
- **Admin** — operational team administration and topic selection inside the Owner-approved GroupMe, without visibility into credential secret names or the connected account's full group list.
- **Scorer** — active-game scoring when assigned.
- **Viewer** — read-only.
- **Guest Scorer** — temporary game-scoped scoring authority accepted through a handoff pass.

## GroupMe

7.56.8 supports both the existing Bot transport and server-side authenticated Topic delivery. Credentials stay in Supabase Edge Function secrets.
