# Install WPI 7.64.6 — Opponent Search Context Polish

1. Apply `WPI_7.64.6_OPPONENT_SEARCH_CONTEXT_POLISH_PATCH.zip` at the repository root.
2. Run `./release-check-live-7.64.6`.
3. No Supabase migration is required.
4. Run `./release-check-clean`.
5. Commit/push only after the full gate passes.

Live validation:
- In the Lamorinda 14U Boys workspace, type `680`; confirm **14U 680 A**, **14U 680 B**, and other 14U Boys matches rank ahead of 12U/16U results.
- Type `Stan`; confirm Stanford suggestions show the age in the primary label, e.g. **14U Stanford A**.
- Select a suggestion; confirm the selected-team hint shows the full contextual label and normal WPI identity matching still succeeds.
- Manual opponent entry must still work.
