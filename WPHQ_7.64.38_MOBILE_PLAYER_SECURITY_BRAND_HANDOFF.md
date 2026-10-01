# Water Polo HQ — 7.64.38 Candidate Handoff
**Date:** September 30, 2026  
**Built from:** pushed 7.64.36 GitHub ZIP supplied September 30  
**Status:** candidate built and locally release-gated clean; user install/device validation still required before commit/push

## Scope
- Keep ECC 7.64.36 frozen; no 7.64.37 live-source code is included.
- Mobile Player Stats: one expandable multi-select picker for up to four players, vertical roster/search UI, Done close action, no duplicate selected-player cards, Overview open by default, detailed stat groups collapsible.
- Desktop Player Stats preserves the existing 7.64.35/7.64.16 experience and stable season-leader identity.
- Mobile Team Insights header keeps Back/My Teams primary and moves secondary actions behind More. Organization Insights and Commercial keep existing access gates.
- Consumer branding cleanup on Team Insights, Event Results, Account Security, Privacy, and Password Reset.
- Security polish: password reset matches the 12-character signup minimum; MFA enrollment label is Water Polo HQ; security readiness checklist added.

## Backend boundary
No Supabase migration. No Edge Function. No scoring, GroupMe, ECC routing, analytics RPC, RLS, or auth-callback contract changes.

## Gate
`./release-check-live-7.64.38`

The gate passed cleanly in the isolated candidate build on September 30, including the preserved 7.64.36 ECC, 7.64.35 stable-player, 7.64.34 organization identity, 7.64.33 auth, 7.64.32 scorer, and 7.64.31 delivery/finalization checks.

After the user installs the patch and gets the same clean gate and real-device/browser validation, commit and push, then export a fresh GitHub ZIP. That new pushed ZIP becomes authoritative.
