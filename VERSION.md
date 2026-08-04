# WPI 7.55.4 — Compact Live Scoring Workflow

- Adds a dedicated, hidden **Sign In / Create Account** gateway at `live-login.html`; the scoring page is no longer the authentication surface.
- Keeps local demo access available until the team-owned Supabase project is connected, while preserving the same future email/password entry point.
- Replaces the button-heavy scorer with a compact mobile sequence: quarter and one `MM:SS` time field, event dropdown, player dropdown, goal-only assist dropdown, optional note, exact GroupMe preview, and one submit button.
- Accepts time as `6:45` or fast numeric entry such as `645`, then normalizes it to `6:45`.
- Uses an explicit **Unassisted** option for goals and removes every generic second-player field from non-goal events.
- Preserves the reusable editable roster and the seven-player lineup selector for game start and every quarter start, with the previous quarter preselected.
- Hides game setup and roster automatically once play begins; a compact edit control can reopen them only when needed.
- Keeps the structured timeline, score corrections, undo, mock GroupMe delivery log, end-of-game analytics, editable recap, and downloadable game log.
- Leaves GroupMe delivery in mock mode until Supabase authentication, shared storage, and the server-side bot secret are connected.
- Keeps all 724 final rankings, 182 clubs, multi-season snapshots, tournament scores, placements, identities, logos, websites, and journeys unchanged.
