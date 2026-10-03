# WPHQ 7.64.42 — ECC Google Live Source Candidate

## Purpose
Connect the 2026 Evan Cousineau Memorial Cup tournament center to the organizer's public Google Sheet `MASTER BY DIVISION` tab while preserving the verified 7.64.36 schedule/routing baseline.

## Source
- Spreadsheet: `1MnXWw7DZ6SCosPD4wy1SY5g4gNMT8h1fa7zYTuO-BoU`
- Tab: `MASTER BY DIVISION`
- Expected games: 335
- Expected divisions: 13
- Browser refresh: 60 seconds
- Access: read-only public Google GViz/CSV; WPHQ never writes to the organizer's sheet.

## Merge policy
- Stable game ID is the reconciliation key.
- The special source IDs `10Cptag01`–`10Cptag16` normalize to WPHQ's existing `10CPT01`–`10CPT16` IDs.
- Google overlays current date/time/venue, official team assignments, and posted results onto the verified WPHQ schedule.
- A result is final only when both posted score cells form a decisive result. Blank/partial/tied score states do not advance the bracket.
- Current Google team assignments supersede stale original-snapshot seed assignments.
- Known source renames preserve existing WPHQ participant IDs. New official teams are synthesized deterministically for the event.
- WPHQ removes stale baseline teams from the live ECC team list when they no longer appear in the current official sheet.
- The verified repository bundle remains the fallback if Google cannot be reached.
- Browser cache preserves the newest successfully validated live result set and prevents a refresh from moving backward to fewer final games.

## Important live roster correction already covered
The current official HS Girls source contains `MID VALLEY` and no longer contains `SD ECA`. The adapter treats MID VALLEY as the official team and removes stale SD ECA from the live event team list.

## Candidate status
Do not commit/push solely from the offline gate. Validate the candidate against the live Google source and in the browser first. Global WPHQ release metadata is intentionally not bumped in this candidate overlay so it can be tested safely on the current pushed 7.64.40 tree before finalization.
