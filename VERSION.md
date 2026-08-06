# WPI 7.56.5 — Scorer Multi-Device Delivery Reliability

- Fixes invited Scorers continuing games originally created by the Owner.
- Replaces cross-account game upserts with explicit existing-game updates and new-game inserts.
- Splits event persistence into creator-preserving updates and authenticated new-event inserts.
- Prevents PostgreSQL RLS insert checks from stopping scorer synchronization before GroupMe dispatch.
- Preserves original game and event creator audit fields while recording the current updater.
- Keeps Owner/Admin GroupMe administration restrictions and Scorer play-delivery permission intact.
- Cache-busts the private WPI Live browser assets to 7.56.5.
- Requires no database migration, GroupMe secret change, or Edge Function deployment.
