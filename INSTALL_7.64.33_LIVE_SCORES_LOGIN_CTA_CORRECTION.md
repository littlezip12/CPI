# WPHQ 7.64.33 — Live Scores Login CTA Correction

Adds an explicit **Log in** button to the public Live Scores hero for signed-out visitors. The CTA uses the existing supporter/My Teams authentication context and is hidden for permanent signed-in sessions. Public score viewing remains available without an account. No Supabase migration or Edge Function deployment is required.

Run:
```bash
./release-check-live-7.64.33
```
