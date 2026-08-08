# WPI 7.56.14 — Action Flow Cleanup & Team Labels

WPI 7.56.14 is a focused poolside UX cleanup built directly on the validated **7.56.13 Game Actions & Automatic GroupMe Summary** baseline.

## Release focus

- Removes the redundant event-type dropdown below the action/variant buttons.
- Uses a hidden internal event-state value instead, so the seven direct action buttons are the only visible event-selection control.
- Goal variants now use the actual game team names (for example, `Lamorinda A` and `Stanford`) instead of `Us` and `Them`.
- Variant prompts are contextual: Which team scored?, Shot result, Save type, Exclusion, and 5M call.
- Team-name buttons wrap safely on mobile for longer club/team names.
- Preserves all 7.56.13 structured analytics events and the automatic post-Final-Whistle GroupMe Game Summary.
- No Supabase migration, GroupMe secret change, or Edge Function redeploy is required.

## Protected foundation

7.56.14 does not change scorer authority, guest handoff, retries/audit, Topic delivery, Bot fallback, database persistence, automatic summary ordering, or Final Whistle sequencing.
