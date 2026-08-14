# WPI 7.58.6 — Supporter Context & Manual Opponent Correction Handoff

This correction was discovered during the real Lamorinda multi-team proving run after 12U Boys was added and cross-team isolation passed.

The permanent 14U Supporter view could filter the game feed to followed 12U, but Tournaments & Weekends still queried the permanent workspace team. The correction introduces a unified read-only viewing context so the selected team drives both the game feed and archive. `All teams` remains available and archive cards are labeled by team.

A new `live_game_series_archive_v4(uuid)` RPC extends archive visibility to legitimate Followers via the existing `live_is_team_follower` relationship. It never creates or modifies membership and never grants event merging or operational permissions.

Manual opponent entry was already technically free-text. The UI now makes that contract explicit: search WPI or enter any team name. Unmatched names are preserved exactly as raw opponent source names and are not silently converted into canonical WPI identities.
