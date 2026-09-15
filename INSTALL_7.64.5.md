# Install WPI 7.64.5 — Mobile Recap & Opponent Search Polish

1. Apply `WPI_7.64.5_MOBILE_RECAP_OPPONENT_SEARCH_POLISH_PATCH.zip` at the repository root.
2. Run `./release-check-live-7.64.5`.
3. No Supabase migration is required.
4. Run `./release-check-clean`.
5. Commit/push only after the full gate passes.

Live validation: on a phone, create a game and type `Stan` in Opponent. Confirm tap-friendly Stanford team matches appear. Select one and verify the existing WPI matched hint/identity behavior. Finalize a throwaway game and verify Back to dashboard is a full-width primary action with Reopen game and Download log compactly below it, with no awkward wrapping.
