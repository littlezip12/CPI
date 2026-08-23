# WPI 7.64.0 — Game Launch Stability Hotfix

Fixes a browser-main-thread lock caused by the additive Supporter fan layer observing body class changes while mutating its own fan-ready class.

Changes:
- Fan layer is completely bypassed when `launch=1` is present (new-game/scorer launch flow).
- Viewer-role observation is state-guarded and reacts only when viewer status actually changes.
- Score/timeline observation is restricted to canonical scorer source nodes; it no longer observes the entire body subtree.
- Fan script URL is cache-busted in `live-game.html` so browsers do not reuse the pre-hotfix JS.
- Protected scorer/backend/storage files are unchanged.
- No Supabase migration, Edge Function deployment, secret, or infrastructure change.
