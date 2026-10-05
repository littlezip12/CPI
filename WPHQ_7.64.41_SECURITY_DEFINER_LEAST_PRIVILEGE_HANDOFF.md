# Water Polo HQ — 7.64.41 Supabase SECURITY DEFINER Least-Privilege Handoff
**Date:** October 1, 2026  
**Built from:** authoritative pushed 7.64.40 GitHub ZIP `CPI-main - 2026-09-30T230529.507.zip`  
**Status:** candidate until local gate, production migration, regression validation, commit and push

## Scope
- Classify the exact 77 production `public` `SECURITY DEFINER` functions flagged in the 7.64.40 audit.
- Restrict signed-out `anon` execution to 13 intentional public endpoints.
- Keep 54 application RPCs executable by `authenticated` + `service_role`.
- Remove direct client execution from 10 trigger/internal functions.
- Preserve guest scoring: Supabase anonymous Auth users use the `authenticated` Postgres role.
- Remove inherited `PUBLIC` EXECUTE from the 77 classified functions.
- Change future `postgres`/`public` function defaults so `PUBLIC`, `anon`, and `authenticated` do not receive EXECUTE automatically.
- Preserve `supabase_auth_admin` execution on the two `auth.users` trigger helpers.

## Production migration
`supabase/migrations/202610010001_security_definer_least_privilege.sql`

This release intentionally does **not** change RLS policy bodies, scoring logic, GroupMe delivery, Edge Functions, player analytics, tournament data, or consumer UI.

## Classification
- **13 public unauthenticated:** public scoreboards/game scores/tournament feeds, public organization overview, ad selection/accounting endpoints, registration status.
- **54 authenticated application:** team/admin/scorer/supporter helpers and RPCs. Function-level authorization/RLS helpers remain intact.
- **10 internal triggers:** owner membership, account/profile capture, game guards, scorer-session finalization trigger, creator preservation.

The machine-readable classification is `config/security-definer-access-v7-64-41.json`.


## Validation already performed during build
- Full local 7.64.41 release gate passes from the exact pushed 7.64.40 ZIP.
- The migration was executed against the live production catalog inside a single transaction with post-change assertions, then **rolled back**. The dry run passed.
- A follow-up read confirmed production remains unchanged at **77** anon-executable `SECURITY DEFINER` functions until Tyler applies the migration intentionally.
- The post-migration validation query itself was syntax-checked against production.

## Emergency rollback
`supabase/rollback/202610010001_security_definer_least_privilege_rollback.sql` restores the exact pre-7.64.41 client-role ACL pattern captured from production (65 functions with PUBLIC direct EXECUTE, 12 without; all 77 directly granted to anon/authenticated/service_role) and restores the prior default function ACL. Use only if production regression requires immediate rollback.

## Required validation after SQL
Run `supabase/validation/202610010001_security_definer_least_privilege_check.sql`. Expected category counts:
- public_anon: 13 functions, all 13 anon/authenticated/service_role, 0 PUBLIC inheritance
- authenticated: 54 functions, 0 anon, 54 authenticated/service_role, 0 PUBLIC inheritance
- internal_trigger: 10 functions, 0 anon/authenticated, 10 service_role, 0 PUBLIC inheritance

Then regression-test browser + physical iPhone:
- signed-out Live Scores + tournament pages
- signed-out organization profile/public games
- permanent account login + My Teams
- supporter follow/unfollow
- Owner dashboard + Team Insights
- guest scorer handoff from a second/anonymous account
- event persistence + Final Whistle
- GroupMe delivery/catch-up
- account signup/password reset/MFA smoke checks

## Remaining public-beta security items
- Supabase leaked-password protection remains disabled and should be enabled in Auth settings if available on the project plan.
- Cloudflare Turnstile still needs end-to-end configuration before broad public signup.
- Re-run Security Advisor after this migration; the anon SECURITY DEFINER warning set should collapse to the intentional public allowlist rather than 77 functions.
