# WPI 7.57.19 — Scorer Handoff & Repeat Final Reliability

This release fixes three pilot regressions found while testing 7.57.18:

1. Supporter game-scoped takeover was visually present but disabled by the read-only role gate. The Supporter can now open and complete the scorer-code handoff while all normal scoring/admin controls remain read-only until the handoff is accepted.
2. Reopen created a `score_correction` audit event without `correctedTeamScore` / `correctedOpponentScore`. Since `recalculateScore()` treats score corrections as authoritative, those undefined values collapsed the score. The reopen event now carries the preserved current score before recalculation.
3. Successful finalization intentionally disabled all End Game controls, but reopen did not re-enable them. Reopen now re-enables all finalization controls. Existing summary events are voided on each reopen, and a new final creates fresh summary events with new IDs from the complete active game state.

There is no new SQL in 7.57.19. The 7.57.18 recovery migration remains required and unchanged. No Edge Function changes.
