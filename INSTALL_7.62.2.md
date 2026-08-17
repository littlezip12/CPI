# Install WPI 7.62.2 — Universal Search & Navigation Cohesion

1. Unzip the patch over the current pushed WPI 7.62.1 repository.
2. Run `./release-check-live-7.62.2`.
3. No Supabase migration, Edge Function deploy, or secret change is required.
4. Run `./release-check-clean`.
5. If the full gate passes, commit and push normally.

## Live validation
- Use the header `Search WPI` control (or Cmd+K) from multiple pages.
- Search `Lamorinda`, `Campolindo`, `Acalanes`, and a specific youth team.
- Organization results should open Organization profiles; team results should open stable Team Hubs.
- The top navigation should show `Organizations` rather than separate `Teams` and `Clubs` silos.
