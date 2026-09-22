# WPI 7.64.15 — Player Roster Accuracy & Parent Privacy

## Player Stats
- Cap numbers are removed from analytics identity and search. Caps remain available to the scorer/game record.
- Game scope shows only players on that game roster. A rostered non-participant is shown as DNP.
- Event/weekend scope is the union of rosters actually attached to games in that event.
- Season scope includes players rostered during that season.
- `client_player_id` is used as the stable analytics identity across roster versions.
- Selections are preserved when a player temporarily disappears in a narrower scope and return when the user goes back to a broader scope.

## Parent privacy/security
- Supporter QR/follow flow uses passwordless one-time email links.
- Password staff signup requires 12 characters in the client; Supabase must also be configured to enforce 12.
- Optional Cloudflare Turnstile integration is included.
- Parent/supporter private data receives a permanent-account guard so anonymous guest-scoring sessions cannot access it.
- Sensitive SECURITY DEFINER RPCs have anonymous/public EXECUTE revoked.
- Known mutable search_path warning is hardened.
- Account Security page supports TOTP MFA enrollment and supporter self-deletion.
- Privacy page documents data collection/minimization.
