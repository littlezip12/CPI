# Install WPI 7.56.2 — GroupMe Delivery and Audit Foundation

Apply this cumulative patch over the pushed WPI 7.56.1 baseline.

The public repository contains only browser-safe code, SQL schema, and the Edge Function source. It contains no GroupMe bot ID, Supabase secret key, service-role key, database password, or AI credential.

After the code release is committed and pushed, follow `LIVE_GROUPME_SETUP_7.56.2.md` to:

1. Apply the incremental GroupMe delivery migration.
2. Create a GroupMe bot in a dedicated test group.
3. Store the bot ID as a Supabase Edge Function secret.
4. Deploy the authenticated `groupme-post` Edge Function.
5. Save and test the destination from the private WPI Live dashboard.

The site remains safe in demo mode until the connected Supabase configuration is activated. GroupMe remains unavailable until the destination is enabled and the server-side bot secret is present.

Run `./release-check` and commit only after the exact final line:

```text
CPI release check passed.
```
