# Water Polo HQ — 7.64.42 ECC Google Live Results + Team Journey History

**Date:** October 3, 2026  
**Built from:** pushed GitHub ZIP `CPI-main - 2026-10-03T125511.817.zip`  
**Status:** finalization overlay; authoritative after local `./release-check-live-7.64.42`, commit, and push

## Final scope
- Uses the organizer's public Google Sheet `MASTER BY DIVISION` as the read-only live ECC result source.
- Reconciles all 335 games / 13 divisions by stable game ID.
- Preserves the verified 7.64.36 schedule and JO-style routing baseline.
- Refreshes live data every 60 seconds with repository fallback and last-good browser cache protection.
- Overlays official current team assignments and decisive posted scores only.
- Normalizes `10Cptag01`–`10Cptag16` to WPHQ's existing `10CPT01`–`10CPT16` game IDs.
- Team Journey shows Games played plus next scheduled game.
- WPHQ never writes to the organizer's Google Sheet.
- Superseded OneDrive 7.64.37 relay/browser automation is not part of the finalized tree.

## Why this finalization overlay exists
The browser-tested 7.64.42 candidate was pushed successfully, but intentionally retained global 7.64.40 release metadata while it was being validated. This overlay promotes the validated ECC work to the actual 7.64.42 release and adds a final release gate.

## Release gate
Run `./release-check-live-7.64.42`. It includes the live anonymous Google CSV source check, so the release should not be pushed if that check fails.
