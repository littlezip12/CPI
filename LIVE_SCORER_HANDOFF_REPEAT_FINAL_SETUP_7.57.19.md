# WPI 7.57.19 — Scorer Handoff & Repeat Final Reliability

## Deployment
This is a cumulative browser hotfix over the current 7.57.18 test state / pushed 7.57.17 baseline.

No additional Supabase SQL is required if the 7.57.18 migration was already applied (Reopen game working proves it was).
No Edge Functions need redeploying.
No secrets change.

## Hosted acceptance
1. Open a live game as a Supporter while another scorer owns control.
2. Tap **Take over scoring**; enter the six-digit code from the active scorer and accept control.
3. Verify the Supporter can score after handoff and their permanent team role remains Supporter.
4. Score at least two goals and note the exact score.
5. End game, then Reopen game.
6. Verify the score is unchanged immediately after reopen.
7. Record another goal and verify it increments from the preserved score.
8. End game again and verify Final Whistle + a newly generated complete recap/summary are produced.
9. Reopen/finalize once more if desired; the cycle must remain repeatable.
