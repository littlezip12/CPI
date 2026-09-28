# WPHQ 7.64.32 — iPhone Time-Field Focus Zoom Correction

This correction stays within 7.64.32. It targets the remaining iPhone zoom that occurred specifically when tapping the Quick Time input after choosing a player.

Changes:
- Quick Time attempts focus immediately from the player-selection interaction rather than one animation frame later.
- The dedicated numeric time field owns its iPhone touch-end focus, preventing the browser-default focus zoom while keeping pinch zoom available generally.
- The caret is returned to the end of the time entry for fast correction/backspace.
- GroupMe, Final Whistle, scorer handoff, backend contracts, and Supabase remain unchanged.
