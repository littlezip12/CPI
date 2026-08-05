# WPI Live 7.56.2 — GroupMe Delivery Setup

This guide activates real WPI → GroupMe delivery for the Lamorinda A 14U Boys pilot.

## Security boundary

Never place any of these in GitHub, `config/live-sandbox.js`, browser JavaScript, screenshots, or chat:

- GroupMe bot ID
- Supabase secret/service-role key
- Database password
- Personal GroupMe access token
- Future AI credentials

The browser stores only the Supabase Project URL and browser-safe publishable key. The GroupMe bot ID remains in the Supabase Edge Function secret store.

## 1. Confirm the connected backend

Open the deployed WPI Live login page and verify that email/password sign-in reaches the private dashboard.

If the site still says **Local demo mode**, complete `LIVE_BACKEND_SETUP_7.56.1.md` first. For a brand-new Supabase project, run the fresh-install SQL `supabase/WPI_LIVE_7_56_2_FULL_SETUP.sql` instead of the older 7.56.1 full setup.

If 7.56.1 is already active, open Supabase **SQL Editor**, paste the contents of:

```text
supabase/migrations/202608040003_groupme_delivery.sql
```

Run it once. The migration is idempotent and adds the destination status, retry queue, attempt audit, dashboard RPCs, and delivery Realtime publication.

## 2. Create a dedicated GroupMe test destination

1. Create a GroupMe group named **WPI Live Scoring Test**.
2. Open the GroupMe Developers bot page while signed in to the GroupMe account that owns the group.
3. Create a bot for the test group.
4. Copy the bot ID into a secure password manager temporarily.

Treat the bot ID like a password: anyone who has it can post as that bot.

## 3. Store the bot ID in Supabase secrets

The pilot uses this secret name:

```text
GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS
```

### Dashboard method

In Supabase, open **Edge Functions → Secrets** and add:

- Name: `GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS`
- Value: the GroupMe bot ID

### Terminal method

From the existing WPI repository:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"

npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
npx supabase secrets set GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS="PASTE_BOT_ID_HERE"
```

Do not save the bot ID in a shell script or `.env` file inside the repository.

## 4. Deploy the authenticated Edge Function

From the WPI repository:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
npx supabase functions deploy groupme-post
```

The bundled `supabase/config.toml` keeps JWT verification enabled. Only signed-in WPI Live users with Owner, Admin, or Scorer access can deliver game events. Only Owners and Admins can send the destination test message.

## 5. Enable and test the destination

1. Open `live-dashboard.html` through the deployed WPI Live login.
2. In **GroupMe connection**, enter:
   - GroupMe name: `WPI Live Scoring Test`
   - Supabase secret name: `GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS`
3. Select **Enable real GroupMe delivery for new games**.
4. Select **Save connection**.
5. Select **Send test message**.
6. Confirm the message appears in the GroupMe test group.

The dashboard stores only the secret's name. It cannot read or display the bot ID.

## 6. Test a full game

1. Create a new manual scrimmage.
2. Record a play that matches the selected message-frequency setting.
3. Confirm the play is stored in WPI first.
4. Confirm the GroupMe play log changes from **Sending** to **Sent**.
5. Confirm the same formatted message appears in GroupMe.
6. End the quarter, start the next lineup, and finish the game.
7. Verify the dashboard retains the game and delivery totals.

## Retry behavior

Each failed delivery remains stored with its error, attempt count, and next retry time. The scorer retries at approximately:

- 1 minute
- 5 minutes
- 15 minutes
- 60 minutes

Automatic retry runs while an authorized WPI Live page remains open. The scorer can also select **Retry** on a failed message. Closing every WPI Live client does not delete the queue; it resumes when an authorized client opens the game again. A fully unattended scheduled worker can be added later if the pilot requires it.

WPI atomically claims each event before posting, treats a recent claim as in-flight, and never retries a delivery already recorded as sent. This prevents ordinary double taps and competing scorer devices from sending the same play. Because GroupMe does not expose a provider-side idempotency key, an unusual network failure after GroupMe accepts a message but before WPI receives the response can still create a small duplicate-message risk on a later retry.

## Delivery audit

WPI stores:

- Event and game
- Destination
- Message snapshot
- Sent, queued, failed, or suppressed status
- Attempt count
- Response code and excerpt
- Last error
- Next retry time
- Signed-in user who invoked the attempt
- Manual, scorer, test, or worker trigger
- Timestamp for each attempt

The audit contains no GroupMe bot credential.

## Before using the parent group

Complete at least one dry run and one real scrimmage in the test group. Only then create or connect the tournament parent GroupMe destination.

A **manual retry** remains available beside any failed message in the private scorer.
