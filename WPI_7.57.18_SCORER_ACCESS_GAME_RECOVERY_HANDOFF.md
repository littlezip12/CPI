# WPI 7.57.18 — Scorer Access & Game Recovery Handoff

Baseline: pushed WPI 7.57.17 `CPI-main - 2026-08-09T215146.834.zip`.

This release addresses four pilot findings:
1. accepted Supporter account promotion to Scorer needed a reliable explicit action;
2. Notes should always be visible but optional;
3. More controls should use clearer game-language;
4. accidental end-game taps need a guarded recovery path.

The release adds a dedicated Supporter→Scorer RPC and UI button, always-visible Notes, `Game actions`, and an audited `Reopen game` workflow. Reopening does not erase sent GroupMe audit. It voids generated final output in structured game state, sends a correction when messaging is active, creates a fresh scorer session, and allows a later correct Final Whistle/summary.

Protected scoring backend, delivery, GroupMe, roster vision, tournament/weekend archive, Supporter/Scorer role shaping, and account registry remain intact.
