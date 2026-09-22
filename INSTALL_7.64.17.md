# Install WPI 7.64.17 — Installable App Experience

1. Install the patch over the pushed 7.64.16 baseline.
2. Run `./release-check-live-7.64.17`.
3. No Supabase migration or Edge Function deployment is required.
4. Run `./release-check-clean`.
5. Commit/push as `WPI 7.64.17 — Installable App Experience`.
6. After deployment, open WPI in Safari/Chrome and install it from the browser/Home Screen flow. The installed app starts at My Teams.

The PWA uses network-first fetching. It does not make live scores or stats available as authoritative offline data.
