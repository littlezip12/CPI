# Install WPHQ 7.64.32 — Poolside Scoring Throughput & Recovery

This release changes only the browser/native scorer interaction layer. It does **not** require a Supabase migration or Edge Function deployment. The validated 7.64.31 GroupMe delivery/finalization backend remains active and unchanged.

## Install

1. Install the 7.64.32 patch at the repository root.
2. Run:

   ```bash
   ./release-check-live-7.64.32
   ```

3. Open a disposable/manual game on an iPhone or other phone-sized browser.
4. Complete the focused poolside test below.
5. Commit/push only after the focused test passes.

## Focused poolside validation

Use a disposable game. GroupMe can remain connected; 7.64.31 delivery should continue normally.

1. **Fast exact-time goal:** tap `Goals` → your team → player, immediately type `632`, then tap **Record**. Confirm one goal is recorded at **6:32** — not the prior clock value.
2. Repeat with another exact-time event (exclusion or 5M). Enter the time quickly. Confirm the UI does not jump backward/reset while entering it.
3. **Use current time:** open an exact-time play and tap **Use current time**. Confirm it only fills the time. The play must not record until **Record** is tapped.
4. **Back:** start a goal, select the wrong player, then tap **Back**. Confirm you can reselect the player without recording anything. Tap Back again if needed to change the team/event option.
5. **Cancel:** start a play, then Cancel. Confirm no event is created.
6. **Routine speed:** record a steal/shot/turnover quickly. Routine stats should still use event → player → immediate record and leave the clock unchanged.
7. **Double tap:** rapidly tap Record twice on an exact-time play. Confirm only one event is created.
8. **Mobile zoom:** move quickly between event/player/time controls. Confirm the browser no longer double-tap/focus zooms during normal scoring. Pinch zoom should still work.
9. Confirm GroupMe receives the test play(s), and Final Whistle still completes normally.

## Deliberately unchanged

- 7.64.31 GroupMe server catch-up
- scorer handoff permissions/finalization
- Final Whistle semantics
- Supabase schema/RLS
- player participation/stat calculations
- Team/Organization Insights
- authentication/login UX

The next planned release is 7.64.33 for email/password sign-up and login UX, followed by the Organization Insights identity/team-scoped season-stat cleanup.
