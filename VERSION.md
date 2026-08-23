# WPI 7.64.1 — Tournament Experience

WPI 7.64.1 turns WPI Live tournament game records into a connected public tournament destination. A tournament center now combines public Live games, upcoming public WPI Live games, recent finals, exact division/stage/game-number context when present, team and division filtering, WPI-team event records, event dates/venues, sharing, youth-safe sponsor inventory, and direct game/team navigation.

Tournament records are deliberately conservative: WPI derives team records only from finalized public WPI Live games and labels them as informational rather than official tournament standings. The tournament schedule likewise contains only games published through WPI Live and does not fabricate missing official schedules, standings, or brackets. Anonymous tournament views remain team-level and never expose rosters, player events, scorer identity, membership, GroupMe delivery data, or private games.

The public WPI Live Center now surfaces recent/active tournament centers and links tournament game cards into the event destination. Public score pages and the authenticated Supporter Game Info view also link back to the tournament center. The 7.64.0 scorer-launch stability boundary remains intact: `launch=1` bypasses the fan layer, and protected scoring/backend/storage/GroupMe/roster-extraction files remain byte-stable.

Supabase migration required: `202608220001_public_tournament_experience.sql`. No Edge Function redeploy, new secret, Stripe activation, notification permission, or infrastructure upgrade is required.
