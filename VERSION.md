# CPI 7.51.6

Boys JO mobile live-update reliability.

- Limits the scheduled live relay to the active Boys JO event while preserving the completed Girls relay bank.
- Reduces relay concurrency from eight workers to three and tries no more than two Google endpoints per division.
- Uses a longer bounded endpoint timeout plus a short retry pause to reduce Google 429 bursts.
- Prevents a relay or direct-Google response with fewer completed results from replacing a newer browser copy.
- Refreshes after mobile Safari or another browser restores the tournament page from back-forward cache.
- Treats a Boys relay older than seven minutes as stale while retaining last-known-good data.
- Preserves JO schedules, groups, subdivisions, final placements, team logos, rankings, and Girls tournament history.
