# CPI 7.51.0

JO live-data relay and last-known-good cache.

- Adds a GitHub Actions-backed CPI relay for all 23 Girls, Coed, and Boys JO divisions.
- Refreshes the relay approximately every five minutes from Google’s public spreadsheet endpoints.
- Validates every candidate with CPI’s existing tournament parser and rejects zero-game, blocking, or severely truncated responses.
- Preserves the most recent valid CSV when Google is unavailable.
- Publishes generated relay data to the isolated `cpi-live-relay` branch rather than committing it to `main`.
- Lets tournament browsers load the CPI relay before attempting Google directly.
- Keeps direct browser-to-Google access as a secondary path for the newest possible update.
- Distinguishes a fresh CPI relay from a last-known-good relay bank in the source-status panel.
- Preserves verified embedded/repository schedules and browser cache as additional fallbacks.
- Leaves rankings, ranking evidence, logos, historical results, and manual ranking controls unchanged.
