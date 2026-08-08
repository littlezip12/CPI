# WPI 7.56.14 — Action Flow Cleanup & Team Labels

Built directly on the validated WPI 7.56.13 Game Actions & Automatic GroupMe Summary baseline.

## User-requested changes

1. Removed the redundant dropdown that appeared below the action variant buttons.
   - `eventType` is now a non-rendering hidden input used only as internal state.
   - The seven direct action buttons and their contextual variant buttons are the only visible event-selection controls.

2. Replaced Goal `Us / Them` with the actual team names.
   - Example: `Lamorinda A / Stanford`.
   - Labels use the game setup values, so this scales automatically to future teams/opponents.

3. Clarified contextual prompts.
   - Goals: `Which team scored?`
   - Shots: `Shot result`
   - Saves: `Save type`
   - Exclusions: `Exclusion`
   - 5M: `5M call`

## Preserved behavior

- Seven direct actions: Goals, Shots, Saves, Steals, Exclusions, Turnover, 5M.
- Full structured analytics event model.
- Save + Field Block paths.
- Scorer handoff and one-active-scorer enforcement.
- Final-save reliability.
- Automatic Final Whistle then Game Summary GroupMe delivery.
- Topic delivery and Bot fallback.
- Retry/audit pipeline.

No Supabase migration, secret change, or Edge Function deployment is required for 7.56.14.
