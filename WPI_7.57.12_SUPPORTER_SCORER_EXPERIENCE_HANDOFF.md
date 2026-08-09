# WPI 7.57.12 — Supporter & Scorer Experience Handoff

Built cumulatively on pushed WPI 7.57.11.

Key decision: **Supporter** replaces Viewer everywhere users see the role, while the database value remains `viewer` to avoid unnecessary migration/RLS risk.

Supporter experience:
- Follow a game
- live games first, then upcoming, then recent finals
- team logos, matchup, time/venue, live/final score
- Follow live / View final read-only scoring console
- no Team Administration sidebar, setup, roster, access, GroupMe, Game Day admin, or History
- no technical backend status strip

Scorer experience:
- Your games
- active game first, then games assigned to them, then unassigned games they can claim
- Start game / Open live game only
- no Team Administration clutter

Owner/Admin experience remains full-featured.

No Supabase migration, Edge Function deploy, or secret changes.
