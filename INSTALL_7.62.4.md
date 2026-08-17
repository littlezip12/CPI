# WPI 7.62.4 — Public Game Publishing & Sharing

## Scope
- Plain-language game audience choices: Team + followers, Team members only, Public on WPI Live.
- Public games expose a shareable score-only URL after the game has a canonical game ID.
- Public score viewers can copy the game link.
- No scoring-authority, roster, GroupMe, event, or delivery behavior changes.

## Infrastructure
- No Supabase migration.
- No Edge Function redeploy.
- No new secret.

## Validation
Run:

```bash
./release-check-live-7.62.4
./release-check-clean
```
