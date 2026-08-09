# WPI 7.57.12 — Supporter & Scorer Experience

This is a browser UX / product-language release. It does **not** change the Supabase role enum.

- Database role `viewer` remains unchanged for compatibility and RLS safety.
- User-facing name is now **Supporter**.
- New invitees still enter through the least-privilege `viewer` role, displayed as Supporter.
- Owner/Admin can later grant Scorer access; only Owner can grant Admin.
- Supporters get a simple Follow a game experience.
- Scorers get a focused Your games experience.
- Owner/Admin retain full Team Administration.

No SQL migration, Edge Function redeploy, or secret change is required.
