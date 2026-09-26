# WPI 7.64.29 — Cross-Device Team QR Fix

WPI 7.64.29 corrects the Share Team QR behavior discovered during real-device QA. Team QR codes and copied team-follow links now resolve to the current public HTTPS Water Polo HQ web surface (`https://littlezip12.github.io/CPI/live-following.html?followTeam=<team UUID>`), so a normal iPhone or Android camera can scan and open them even when the native WPHQ app is not installed. The native custom-scheme route `waterpolohq://team/<team UUID>` remains preserved for installed-app/development deep-link testing and future handoff logic, but it is no longer used as the QR payload. When WPHQ moves to its final production domain, this HTTPS share contract can become the Universal Link/App Link surface without changing the QR model again. No database migration or Edge Function deployment is required.

# WPI 7.64.28 — Native Team Link & QR Onboarding

WPI 7.64.28 connects Water Polo HQ team sharing to the native mobile shell without changing the existing browser fallback. The iOS app now recognizes custom-scheme team links in the form `waterpolohq://team/<team UUID>` (plus a compatibility `waterpolohq://follow?team=<team UUID>` form) and routes them into the existing `live-following.html?followTeam=<team UUID>` onboarding flow. Signed-out users keep the requested team through supporter magic-link sign-in, and signed-in users continue to auto-follow the exact Live team with read-only supporter access.

The existing Share Team dialog now uses Water Polo HQ language and, when running inside the native app, generates an app-opening QR while keeping the copied browser link as the cross-platform fallback. Team Hub sign-in now preserves the exact Live team when available. Universal Links/App Links remain deferred until the production Water Polo HQ domain is final. No database migration or Edge Function deployment is required.

# WPI 7.64.27 — Native Auth Polish & Team Follow Persistence

WPI 7.64.27 polishes the now-validated Water Polo HQ native supporter authentication flow and locks in My Teams persistence behavior. User-facing supporter/login copy now uses Water Polo HQ rather than legacy WPI/WPI Live language, raw Supabase authentication errors are translated into clear user messages, and successful team-follow messaging explicitly confirms that follows are saved to the user account.

My Teams persistence remains server-backed through the existing Supabase `live_team_follows` / `live_public_team_follows` tables and read-only follow RPCs. The release adds regression coverage that confirms the active app restores the authenticated session, reloads follow state from Supabase on launch, and does not rely on localStorage/sessionStorage for follow ownership. The iOS magic-link bridge validated in 7.64.26 is preserved unchanged. No database migration or Edge Function deployment is required.

# WPI 7.64.26 — Native Authentication Bridge

WPI 7.64.26 adds the first native authentication return path for Water Polo HQ. The iOS app now registers the custom URL callback `waterpolohq://auth/callback`, the generated Capacitor bundle listens for cold-start and foreground URL-open events, and the supporter passwordless login flow uses that callback only when running inside the native shell. The bridge can complete Supabase implicit-token, PKCE code, or token-hash returns and then restore the intended My Teams destination.

The existing browser/PWA authentication path is preserved unchanged. Supabase session persistence remains handled by the existing JavaScript client with `persistSession: true`. Universal Links remain deferred until the production Water Polo HQ domain is final. Before beta distribution, the native redirect must be added to Supabase Auth URL Configuration and validated end-to-end on a real iPhone. No database migration or Edge Function deployment is required.

# WPI 7.64.25 — My Teams Seasonal Entry Cleanup

WPI 7.64.25 removes the High Schools action from the current My Teams supporter/native entry experience because high-school workflows are deferred for this season. The signed-out entry now presents **Live Scores** and **Find a Team**, with Find a Team routing to the public Teams & Clubs directory.

High-school code, data, routes, and prior foundation work remain preserved for a future season; this release only removes the feature from the current primary entry surface. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.24 — My Teams Signed-Out Visibility Fix

WPI 7.64.24 fixes the final issue found during the first iPhone Simulator QA pass. Authentication-only controls on My Teams were correctly marked `hidden` in HTML but older page-level button/link CSS could override the browser's default hidden rendering. A focused successor stylesheet now enforces hidden state for those controls and for the signed-in/signed-out content regions.

Signed-out users keep public navigation such as Live Scores and High Schools plus the supporter sign-in/create-account card. Add another team, Team Dashboard, Account Security, Sign out, and signed-in My Teams content remain unavailable until a permanent authenticated session is confirmed. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.23 — iOS First-Run Native Polish

WPI 7.64.23 turns the first successful Water Polo HQ iPhone Simulator launch into a native-safe baseline. The generated mobile bundle now marks every page as running inside the native shell before application scripts execute, applies iPhone safe-area spacing, removes browser/PWA install controls from the native app, uses compact native navigation labels, and keeps signed-in-only My Teams actions hidden until a permanent supporter/member session is confirmed. TypeScript is now an explicit development dependency so a clean Capacitor setup can read `capacitor.config.ts` without manual repair.

The first iOS simulator launch was successfully validated on an iPhone 17 simulator running iOS 27.0. Existing web/PWA behavior, scoring, Supabase schema, GroupMe delivery, rankings, tournament data, and internal WPI contracts remain unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.22 — WPHQ Mobile App Foundation

WPI 7.64.22 establishes the native mobile foundation for Water Polo HQ without forking or rewriting the mature web product. The release adds a Capacitor 8 project contract, Node/package metadata, a generated native web-bundle pipeline, a native toolchain doctor, a My Teams cold-start contract, and native-safe handling for the existing PWA install/service-worker runtime. The universal WPHQ shell also preserves a normal Home route inside the native app.

The provisional native bundle identifier is `com.waterpolohq.app`. Native iOS and Android projects are intentionally not generated in this release; first confirm the local toolchain and final app identity, then create the platform projects in the next controlled release. Universal/App Links and the native Supabase magic-link callback are also intentionally deferred until the production WPHQ domain is final and can be validated end to end.

Water Polo HQ remains the consumer-facing brand; Water Polo Index remains the rankings methodology. Existing internal WPI identifiers, database tables, scorer contracts, analytics RPCs, GroupMe delivery, verified tournament/ranking data, and web authentication behavior remain unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.21 — Hero Contrast & Organizations Polish

WPI 7.64.21 is a small follow-up polish release after the Water Polo HQ cleanup/rebrand push. It fixes the shared section-landing hero contrast issue introduced by the light WPHQ brand treatment so Rankings, Teams, Clubs, Tournaments, and Methodology remain clearly readable. The release also removes the redundant standalone Organizations back-link, updates the Organizations page to Water Polo HQ copy, and refreshes the universal shell cache key for the approved WPHQ logo and brand stylesheet.

Water Polo HQ remains the consumer-facing brand; Water Polo Index remains the rankings methodology. Existing internal WPI identifiers, database tables, scorer contracts, analytics RPCs, GroupMe delivery, and verified tournament/ranking data remain unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.19 — Water Polo HQ Brand System & Release Gate Hardening

WPI 7.64.19 corrects the Water Polo HQ production logo so the Q contains a recognizable water-polo ball rather than the earlier net-like seam treatment. The approved WPHQ artwork is now the canonical header/logo source and is carried through the installable app icons. The release also hardens recurring historical release checks that had been failing only because newer versions were not manually added to old allowlists. Those gates now validate preserved release markers, semantic behavior and current consumer-brand labels instead of requiring a new exception every release.

Water Polo HQ remains the consumer-facing brand; Water Polo Index remains the rankings methodology. Existing internal WPI identifiers, database tables, scorer contracts, analytics RPCs, GroupMe delivery, and verified tournament/ranking data remain unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.18 — Water Polo HQ Brand Foundation

WPI 7.64.18 begins the controlled consumer-facing transition to **Water Polo HQ (WPHQ)** without renaming mature backend contracts or rebuilding the product. The release adds a clean WPHQ logo system, a light navy/blue/cyan visual language, a white/light universal navigation shell, a refreshed homepage, and Water Polo HQ identity across the installable PWA and key supporter/public entry surfaces.

**Water Polo Index remains the name of the ranking methodology.** Existing internal WPI identifiers, database tables, scoring contracts, analytics RPCs, GroupMe delivery, protected foundation files, and verified tournament/ranking data remain unchanged. Deeper operational copy still using “WPI Live” is intentionally deferred to the next controlled rebrand sweep rather than changed in one risky search-and-replace.

No Supabase migration or Edge Function deployment is required.

# WPI 7.64.17 — Installable App Experience

WPI 7.64.17 makes the existing supporter experience installable on phones and desktops without splitting the product into native iOS/Android codebases. The PWA launches into My Teams, carries WPI Home Screen icons and standalone display metadata, keeps normal QR/GroupMe deep links intact, and uses a network-first service worker so live data and current code remain authoritative whenever a connection is available.

The service worker never proxies or caches Supabase/Auth traffic because those requests are cross-origin; same-origin navigation/static files use network-first delivery with a small offline shell as fallback. Scoring, GroupMe, analytics, roster rules, parent privacy, and backend behavior are unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.16 — Player Stats Visual Polish

WPI 7.64.16 makes desktop Player Stats substantially lighter and easier to scan. Player comparison tables now use explicit white and soft blue-gray surfaces, dark readable values, lighter stat-label cells, subtle alternating rows, clearer section bands, and slightly larger table text. The release also prevents WPI's legacy global dark table styling from bleeding into the Player Stats comparison surface.

Mobile Player Stats, roster scoping, player identity, analytics calculations, Supabase security, scoring, GroupMe, and tournament data are unchanged. No Supabase migration or Edge Function deployment is required.

# WPI 7.64.15 — Player Roster Accuracy & Parent Privacy

WPI 7.64.15 removes cap numbers from Player Stats identity, limits Game/Event comparisons to players actually rostered for that scope, preserves stable player identity across roster versions, adds passwordless one-time email sign-in for Supporters, optional Turnstile support, Account Security with TOTP MFA enrollment and supporter self-deletion, a privacy page, permanent-account RLS guards, sensitive RPC permission hardening, and a fix for the remaining mutable function search_path warning.

Supabase migration: `202609210002_player_roster_privacy_hardening.sql`. Deploy the `account-delete-v7-64-15` Edge Function with JWT verification enabled. Supabase Auth dashboard controls for email confirmation, leaked-password protection, password minimum, CAPTCHA, SSL and network restrictions are documented in `WPI_7.64.15_SUPABASE_PRIVACY_CONTROLS.md`.

# WPI 7.64.14 — Player Stats Experience

WPI 7.64.14 redesigns Player Stats around a responsive comparison workflow that works on phones and desktops. The interface uses cap-and-name player tiles with no player photos, Season / Event / Game tabs, searchable selection for up to four players, grouped stat sections, and mobile player cards instead of a forced horizontal desktop table. Selected players persist while changing scopes and across page reloads for the same team/season. A selected player who did not participate in an individual game remains visible as DNP; a player who participated without tracked production remains distinguishable as Played with 0 recorded stats.

No Supabase migration or Edge Function deployment is required. The analytics RPC and access controls are unchanged.

# WPI 7.64.13 — Team Follow & QR Onboarding

WPI 7.64.13 makes team discovery and supporter onboarding direct instead of directory-first. Every WPI Live team can be shared with a stable team-specific follow link and QR code. Scanning the QR opens the exact team; signed-out users are routed through supporter sign-in/create-account while preserving the requested team, and signed-in users add that team to My Teams with read-only follow access.

My Teams now exposes **+ Add another team**, uses **Team Stats** as the public-facing analytics label, and no longer opens with a wall of directory cards. The Find your team section starts with search/filter controls and only renders matching teams once the user searches or narrows a filter. Team cards include **Share Team** for easy link/QR distribution. Team Owners/Admins also receive **Share team** beside the follower count in Team Access.

The QR/share flow includes Copy link, Download QR, and Print actions. It reuses the existing read-only `live_set_team_follow_v2` path; it does not create team membership, scoring authority, or admin access. No Supabase migration, Edge Function, GroupMe, billing, roster, scoring, or tournament changes are required.

# WPI 7.64.12 — Team Stats Home Entry

WPI 7.64.12 makes team and player analytics easier to reach from the first WPI Live screen. The public WPI Live hero now includes a prominent **Team Stats** action alongside My Teams, Find a team, and Team dashboard.

The Team Stats action is account-aware without exposing private data. A signed-in user with exactly one accessible WPI team is routed directly to that team’s existing Team Insights analytics page. Users with multiple teams are routed to My Teams to choose the correct team. Signed-out users are routed through the normal supporter sign-in flow instead of landing on an analytics page with no team context.

This is a navigation/discoverability release only. The underlying Team Insights analytics engine, entitlements, player/team statistics, scoring, GroupMe, Supabase schema, and protected backend files are unchanged. No migration or Edge Function deployment is required.

# WPI 7.64.11 — Game-Day Accuracy & Final Whistle

WPI 7.64.11 turns the first real BAWPL weekend feedback into a lower-friction, correction-safe scoring workflow. Games Played is now based on explicit per-game participation rather than inferred stat activity: starters and players with recorded events are automatically marked Played, players removed from the day roster are DNP, and Final Whistle asks only about unresolved zero-stat players. This preserves the difference between “played with zero recorded stats” and “did not play.”

Fast Scorekeeping no longer asks for exact time on routine shots, saves, steals, turnovers, and field blocks. Those actions inherit the current/last clock and record immediately after player selection. Goals, opponent goals, exclusions, and 5M events retain the Quick Time Pad. The scorer also gains Edit Last Play plus immediate quarter-end recovery; post-final event/participation corrections now refresh canonical analytics instead of leaving stale downstream totals.

Final Whistle delivery is made explicit and retry-safe. GroupMe receives the generated Game Story and team-level stats only, plus a WPI-rendered team-stats image card when GroupMe image upload succeeds. Player-stat dumps stay inside WPI. The scorer explicitly dispatches final summary events after finalization so they cannot be stranded by the scorer-control transition to read-only.

Supabase migration: `202609210001_game_day_accuracy_final_whistle.sql`. The `groupme-post-v7-64-11` Edge Function must also be deployed for the stats-image attachment path. No GroupMe secret rotation is required.

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