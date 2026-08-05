# WPI 7.56.3 — Live Event Delivery Dispatch Reliability

- Fixes connected scored-game messages that could remain locally Queued even though the play itself was saved to Supabase.
- Uses event IDs returned by the live-event upsert as the primary GroupMe dispatch mapping.
- Falls back to a direct server-event lookup when an upsert mapping is unavailable.
- Replaces silent dispatch skips with a visible Failed state and retry detail.
- Automatically reprocesses due queued or failed messages when an authorized scorer reopens a game.
- Refreshes delivery audit state immediately after dispatch.
- Cache-busts all WPI Live browser assets to 7.56.3.
- Requires no database migration, GroupMe bot change, Supabase secret change, or Edge Function redeployment.
- Preserves the 724 frozen rankings, 182 clubs, seasons, tournaments, roles, and existing scoring behavior.
