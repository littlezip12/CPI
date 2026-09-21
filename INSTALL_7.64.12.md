# Install WPI 7.64.12 — Team Stats Home Entry

1. Install the patch at the repository root.
2. Run `./release-check-live-7.64.12`.
3. No Supabase migration is required.
4. No Edge Function deployment or secret change is required.
5. Run `./release-check-clean`.
6. Commit/push after the gate passes.

## Live validation

- Open `live.html` and verify **Team Stats** is visible in the hero actions.
- When signed in with exactly one accessible WPI team, **Team Stats** should open that team’s stats directly.
- When the account has multiple teams, **Team Stats** should open My Teams so the user can choose a team.
- When signed out, **Team Stats** should route to the supporter sign-in flow rather than an empty Team Insights page.
