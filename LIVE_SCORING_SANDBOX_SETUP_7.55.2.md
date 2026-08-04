# WPI 7.55.2 Live Scoring Sandbox Setup

## Repository and Terminal

Keep using the existing repository and Terminal location:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
```

A second GitHub repository is not needed. The Supabase project is a separate hosted backend, but its migration and Edge Function source live safely inside this same WPI repository under `supabase/`.

## What works immediately after installing 7.55.2

Open:

```text
https://littlezip12.github.io/CPI/live-sandbox.html
```

The page is hidden from WPI navigation and marked `noindex`. It starts in local demo mode:

- Create a dry-run or scrimmage game.
- Enter a roster and starting lineup.
- Record structured actions and manually update quarter/time remaining.
- Test score changes, undo, corrections, and message frequency.
- Preview the exact GroupMe messages without sending them.
- Generate game analytics and an editable parent recap.
- Download the complete sandbox game log.

Demo data stays only in that browser's local storage. It is not secure shared storage and should be used only for interface testing.

## What still requires the team-owned Supabase project

The connected sandbox will add:

- Real email/password accounts.
- Owner, Admin, Scorer, and Viewer roles.
- Shared realtime games across devices.
- Persistent team rosters and scrimmage history.
- Server-side GroupMe delivery and retries.
- A complete scorer and correction audit trail.

The repository already contains the backend blueprint:

- `supabase/migrations/202608040001_live_scoring_sandbox.sql`
- `supabase/functions/groupme-post/index.ts`
- `config/live-sandbox.js`

Do not place a GroupMe bot ID, Supabase service-role key, password, or other secret in GitHub. The browser config will eventually contain only the Supabase project URL and publishable key; those values are intended for client applications and remain protected by Row Level Security.

## Next setup step after the release is pushed

1. Create a Supabase account/project owned by the team administrator.
2. Keep the project separate from GitHub credentials; do not create another repository.
3. Apply the included SQL migration.
4. Add the first Owner account.
5. Connect the public project URL and publishable key in `config/live-sandbox.js`.
6. Create a temporary GroupMe named **WPI Live Scoring Test**.
7. Create its bot and store the bot ID only as the Supabase Edge Function secret `GROUPME_BOT_ID`.
8. Deploy the included `groupme-post` function.
9. Run a dry test before using the system at a scrimmage.

The next WPI release will provide the exact dashboard/Terminal steps for the connected project once the team-owned Supabase project exists.
