# WPI 7.64.10 — BAWPL Event & TBD Game Readiness

WPI 7.64.10 adds a real league/event model for recurring competition such as BAWPL and a private planned-game-slot workflow for schedules that are not published yet. Owners/Admins can save an event name, game date, and known game count without creating fake opponents or start times. Planned slots remain operational/private and are not scored or published.

When schedule details arrive, a planned slot opens the normal game form. Adding the real opponent (and time when known) converts that slot into the canonical WPI Live game, preserves the original planned date, and keeps all future BAWPL weekends under one durable event record. Tournament, regular-season, Scrimmage Weekend, scorer, GroupMe, Quick Time, and recap behavior remain intact.

Supabase migration: `202609160002_bawpl_event_tbd_game_readiness.sql`. The migration is required before deploying this release.

# WPI 7.64.9 — Mobile Scoring Simplification & GroupMe Game Story

WPI 7.64.9 turns the 7.64.8 Quick Time Pad into the single normal scoring workflow. The legacy Time of play, Set time, main-form assist/note preview and Submit play controls remain in the DOM only as engine fallback hooks, but are removed from the normal scorer surface when Quick Time is active. Scoring is now Event → Player → Quick Time, with assist and an optional note handled inside the Quick Time sheet.

The mobile connection strip is reorganized so connection/sync state gets its own row and Dashboard / Sign out receive separate full-width action space instead of being crushed together on narrow phones.

Final Whistle GroupMe delivery now includes the same generated Game Story used by the recap, followed by structured game stats, period scores, player stats and scorer notes. The story continues to praise individual players for positive highlights while negative commentary remains at the team/game level.

No Supabase migration, Edge Function deployment, secret, billing, or protected foundation change is required.

# WPI 7.64.8 — Game-Day Speed & Storytelling

WPI 7.64.8 makes live scoring faster and the final game record more useful. Permanent roster identity can now use a player name, cap number, or both. Game-day cap assignments are stored with the game instead of rewriting the permanent roster, while Team Owners/Admins can save a cap set to the event for tournaments such as ECC and let later games inherit it.

The scorer workflow is now event-first: choose the play, choose the player when needed, then use a large Quick Time Pad. Compact entries such as `632`, `105`, and `48` resolve to `6:32`, `1:05`, and `0:48`; Same time and ±1 second shortcuts reduce repeat entry. The optional running-clock concept is intentionally not included.

The end-of-game narrative is now a Game Story rather than a stat dump. It describes the result and game shape, can call out defensive/offensive themes and scoring runs, and highlights positive player contributions such as goals, assists, saves, steals, and blocks. Negative observations remain at the team/game level rather than criticizing individual youth players. Game Stats remain a separate structured section.

Supabase migration: `202609160001_game_day_speed_storytelling.sql`. The migration is required before deploying this release.

WPI 7.64.7 builds the 2026 USA Water Polo Champions Cup qualification layer on the pushed WPI 7.64.6 baseline.

The release adds a public national qualifier tracker covering all 12 USA Water Polo zones while preserving WPI's verified-data rule: a zone is not treated as having a qualifier until USA Water Polo or the zone confirms it, and WPI does not invent schedules, opponents, venues, brackets, standings, allocations, or results.

The Pacific Zone is activated from its official calendar date of September 27, 2026. Lamorinda A 14U Boys is connected in the tracker to its existing WPI Live tournament series. Until official games are published, its qualifier record correctly remains 0–0–0 with 0 GF and 0 GA. When qualifier games are later finalized and explicitly public on WPI Live, the tracker can read the existing sanitized public tournament RPC and update Lamorinda’s W-L-T/GF/GA automatically without exposing private games or player data.

The 2026–2027 tournament season now begins with the verified Pacific Zone qualifier on September 27; the Evan Cousineau Memorial Cup remains the next announced club tournament on October 3–4.

No Supabase migration is required. No protected scorer/backend files are changed.

## Preserved 7.64.6 opponent-search foundation

Opponent suggestions continue to show team context directly in the primary label. Club teams render as **age + team name**, including **14U Stanford A**, **14U 680 A**, and **14U Davis B**. The club and gender remain visible as secondary context.

Search results remain ranked by the team creating the game before text-match strength, with age/division first and gender as secondary context. JV and Varsity context remains supported for future high-school workspace reactivation. High-school teams remain excluded from normal club opponent search during the current club-only operating mode.

Selecting a club suggestion still writes the established canonical team name into the opponent field so the existing identity-resolution and reconciliation path remains unchanged. Manual opponent entry remains available as the fallback.