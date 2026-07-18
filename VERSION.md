# CPI 7.50.4

JO Journey Resolution & Performance.

- Makes verified or cached schedules available before the live Google refresh finishes.
- Lazily parses Boys JO embedded schedules so only the selected division is initialized.
- Resolves live bracket labels such as `W10-LAMORINDA A` and `L13-LAMORINDA B`.
- Correctly displays the next scheduled game after a completed result.
- Projects possible opponents and conditional winner/loser paths through later bracket and pool games.
- Adds a team-to-games index to reduce repeated full-schedule scans.
- Leaves rankings and automatic publication rules unchanged.
