# WPI 7.64.17 — Universal Shell Gate Hotfix

This hotfix keeps the 7.64.17 installable-app release unchanged while making the new offline fallback comply with the universal WPI shell invariant introduced in 7.52.3.

Changes:
- `offline.html` now loads exactly one shared WPI shell stylesheet/script and one command-palette stylesheet/script using the canonical cache-key versions.
- The offline fallback retains its purpose-built offline card without replacing the shared WPI header/footer shell.
- `sw-v7-64-17.js` precaches the shared shell, command palette, and WPI branding assets so the offline fallback can render its shell when connectivity is unavailable.
- The 7.64.17 PWA regression test now verifies those offline-shell dependencies.

No Supabase migration, Edge Function deploy, backend change, scorer change, analytics change, or GroupMe change is required.
