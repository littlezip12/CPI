# WPI 7.56.1 — Connected Live Backend Setup

This release keeps the existing GitHub repository and Terminal workflow. The Supabase project is a hosted backend owned by the WPI/team account; it is not a second GitHub repository.

## What 7.56.1 provides

- Real email/password sign-in, signup, email verification, password reset, and persistent sessions once Supabase is configured.
- A private WPI Live dashboard between login and the scoring console.
- Team Owner, Admin, Scorer, and Viewer roles enforced by Postgres Row Level Security.
- A secure one-time first-owner bootstrap for **Lamorinda A 14U Boys**.
- Invite-only registration after the first workspace exists, with private links for additional Admins, Scorers, and Viewers.
- Permanent Postgres storage for teams, rosters, players, games, lineups, events, corrections, delivery audit rows, recap drafts, and analytics snapshots.
- Realtime game-state subscriptions for authorized team members.
- Browser-local fallback if the network is temporarily unavailable.
- Existing local demo mode until the hosted project is activated.

GroupMe remains in preview/mock mode for this release. The server-side GroupMe function stays disabled until the connected backend is tested and a test bot is configured.

## Step 1 — Create the Supabase project

1. Sign into Supabase under an account controlled by WPI/the team owner.
2. Create one project for the WPI Live pilot.
3. Save the project name and database password in your own password manager. Do not put them in GitHub or send them in chat.
4. Wait for the project to finish provisioning.

## Step 2 — Configure authentication URLs

In **Authentication → URL Configuration** set:

- Site URL: `https://littlezip12.github.io/CPI/live-dashboard.html`
- Additional redirect URL: `https://littlezip12.github.io/CPI/live-dashboard.html`
- Additional redirect URL: `https://littlezip12.github.io/CPI/live-password-reset.html`
- Optional local testing URL: `http://localhost:8000/live-dashboard.html`
- Optional local reset URL: `http://localhost:8000/live-password-reset.html`

Keep email/password authentication enabled. Email confirmation is recommended for the pilot.

## Step 3 — Create the private database

Open **SQL Editor**, create a new query, and paste the complete contents of:

`supabase/WPI_LIVE_7_56_1_FULL_SETUP.sql`

Run the query once. It creates the private data model, role policies, owner bootstrap, invitations, recap storage, and realtime publication.

Do not run the setup repeatedly against a populated production project. Future changes will use numbered migrations.

## Step 4 — Activate the browser-safe connection

From **Project Settings → API**, copy only:

- Project URL
- Publishable key (`sb_publishable_...`) or legacy anon key

The publishable key is intended for browser use with RLS. Never copy a secret key or service-role key into WPI files.

Run from Terminal, replacing the two sample values:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

python3 scripts/configure-live-backend-v7-56-1.py \
  --url "https://YOUR_PROJECT.supabase.co" \
  --publishable-key "sb_publishable_YOUR_KEY"

./release-check
```

To return to local-only demo mode:

```bash
python3 scripts/configure-live-backend-v7-56-1.py --demo
```

## Step 5 — Create the first Owner

1. Open `https://littlezip12.github.io/CPI/live-login.html` after the configuration is committed and deployed.
2. Choose **Create account**.
3. Enter your own email, display name, and password.
4. Confirm the verification email.
5. Sign in.

The first authenticated user automatically creates the **Lamorinda A 14U Boys** workspace and becomes its Team Owner. After that workspace exists, database policy requires every additional account to use a private team invitation; uninvited users cannot create another pilot workspace.

## Step 6 — Test the connected workflow

From the WPI Live dashboard:

1. Create a manual scrimmage.
2. Update and save the roster.
3. Set starters and start the game.
4. Record several plays.
5. Refresh the browser or open the game from another authorized device.
6. Confirm the score, timeline, lineups, and plays are restored.
7. End the game and confirm it remains in Game History.
8. Reset a new test game and verify the prior game remains stored.

## Roles

- **Owner:** full workspace control, Admin invitations, GroupMe settings, ownership transfer.
- **Admin:** roster/game management and invitations for Scorers/Viewers.
- **Scorer:** create games, edit rosters, record/correct plays, lineups, and recaps.
- **Viewer:** read-only private game and analytics access.

The first invitation version creates a private link for the Owner/Admin to send manually. Automated invitation email delivery can be added later.

## Data model

Permanent private records are stored in:

- `live_teams`
- `live_team_members`
- `live_profiles`
- `live_team_invites`
- `live_rosters`
- `live_players`
- `live_games`
- `live_lineups`
- `live_events`
- `live_deliveries`
- `live_game_recaps`

The exact scorer state is also stored in `live_games.state_snapshot` for reliable resume. The normalized `live_events` table remains the analytics source of truth.

## Security rules

- Never put a Supabase secret key, service-role key, database password, GroupMe bot ID, or AI API key into GitHub or browser JavaScript.
- All exposed tables have Row Level Security enabled.
- The browser uses only the publishable key and the signed-in user’s JWT.
- Team access is restricted by membership and role.
- GroupMe and future AI calls must run from authenticated server-side functions.
- Youth player data remains team-private by default.

## Next release

WPI 7.56.2 will activate the server-side GroupMe test-group delivery, queue/retry behavior, and delivery status—after connected authentication and storage pass the multi-device test.
