# WPI 7.64.13 — Team Follow & QR Onboarding

## Scope
- Stable team-specific supporter follow URLs: `live-following.html?followTeam=<team UUID>`.
- QR code, Copy link, Download QR and Print actions.
- Preserve `followTeam` through supporter sign-in/signup/email confirmation.
- Auto-follow the exact active WPI Live team after authentication using the existing read-only follow RPC.
- Add Share Team to My Teams and Team Access.
- Add **+ Add another team** and make discovery search-first rather than rendering a directory wall by default.
- Rename supporter-facing Team Insights links in My Teams to **Team Stats**.

## Safety
Following remains read-only and does not change team membership, scorer authority, Owner/Admin access, roster data or game data. No database or Edge Function change.

## Validation
Run `./release-check-live-7.64.13`, then `./release-check-clean`.
