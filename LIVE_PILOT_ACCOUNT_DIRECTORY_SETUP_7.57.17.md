# WPI Live 7.57.17 — Pilot Account Directory Setup

## Purpose
Give the original WPI Platform Owner a protected operational view of the names, emails and lifecycle data already collected for WPI Live accounts, without exposing a broad directory to Admins, Scorers or Supporters.

## Supabase
Run:

`supabase/migrations/202608090006_pilot_account_directory_access_operations.sql`

There are no Edge Function or secret changes.

## Hosted acceptance
1. Sign in as the original WPI Platform Owner.
2. Open **Team access**.
3. Confirm **Account registry** appears beside the team-member count.
4. Open it and confirm account records show name/email, signup source, registration date, verification, last sign-in, initial team, and memberships.
5. Search by name/email/team/role.
6. Export CSV and confirm the file contains only the displayed operational fields.
7. Sign in as an Admin or other non-Platform-Owner account and confirm the Account registry control is not exposed.
8. Confirm Supporter and Scorer dashboards are unchanged.

## Privacy/security contract
- No passwords, auth tokens, GroupMe credentials, OpenAI keys, or secret material is returned.
- Account creation is not marketing opt-in.
- This release does not create a public/member-searchable directory.
