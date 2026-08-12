# WPI 7.57.21 — Final Recovery Permission Hotfix Handoff

Built from pushed WPI 7.57.20 baseline `CPI-main - 2026-08-11T203723.016.zip`.

## Fix
Owner/Admin final-game reopen already worked. The missing behavior was specific to a Supporter who legitimately took over scoring with a scorer handoff, ended the game, and then lost the visible Reopen action because their permanent membership remains internal `viewer` after the active scorer session closes.

7.57.21 adds server-backed recovery eligibility. Reopen is shown to Owner/Admin and to the legitimate most-recent scorer while the 30-minute recovery window is valid, including a Supporter/Guest Scorer who acquired game-scoped scoring authority. Ordinary Supporters remain unable to reopen.

The server-side reopen RPC remains authoritative and uses the same rule, so the UI is not the security boundary.

## Preserved
- 7.57.20 post-handoff persistence and GroupMe delivery
- Supporter permanent role remains Supporter
- exactly-one-active-scorer enforcement
- 7.57.19 score preservation after reopen
- immediate scoring-control restoration after reopen
- repeat Final → Reopen → Final cycles
- fresh complete recap on each later Final
- GroupMe delivery audit
- protected 7.56.15 scoring/delivery foundation

## Supabase
Apply `202608110002_final_recovery_permission_hotfix.sql`.
No Edge Function redeploy and no secret changes.
