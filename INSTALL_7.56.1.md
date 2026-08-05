# Install WPI 7.56.1 — Connected Live Backend Foundation

Apply this cumulative patch over the pushed WPI 7.56.0 baseline.

The site remains in local demo mode after the code patch is installed. Real connected accounts and shared storage activate only after the team-owned Supabase project is created, the bundled SQL is run, and the browser-safe Project URL/publishable key are configured using `scripts/configure-live-backend-v7-56-1.py`.

GroupMe remains preview/mock-only in this release. Do not add a GroupMe bot ID, Supabase secret/service-role key, database password, or AI credential to GitHub or browser JavaScript.

Run `./release-check` and commit only after the exact final line:

```text
CPI release check passed.
```

After the release is deployed, follow `LIVE_BACKEND_SETUP_7.56.1.md` to activate the connected pilot.
