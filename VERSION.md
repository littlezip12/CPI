# CPI 7.43.0

Full JO Schedule Banking & Source Reliability.

- Monitors all 23 registered Junior Olympics divisions through one authoritative Google Sheets source per division.
- Adds a tournament source-health dashboard with freshness, banking, schedule, and completed-game status.
- Preserves scheduled games separately from completed results.
- Treats blank `0-0` cells and partial score entries as scheduled, not final.
- Prevents pre-tournament schedules from creating records or ranking evidence before real scores exist.
- Shows official source, last successful refresh, scheduled games, and completed games in both JO viewers.
- Writes a complete sync report after every automated attempt, including current, stale, unbanked, and failed divisions.
- Keeps last-known-good snapshots when a live source is blank, invalid, or unexpectedly truncated.

The checked-in bootstrap remains the verified 192-game 14U Girls Championship schedule with zero completed games. GitHub Actions attempts all 23 JO divisions every two hours.
