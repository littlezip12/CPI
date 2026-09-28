# WPHQ 7.64.33 — Account Sign-Up & Login UX Handoff

## Why this release exists
The supporter follow flow was intentionally passwordless in 7.64.27, which meant users had to request and open a Magic Link for normal sign-in. Product direction changed: supporters should create a normal permanent account once, verify email on initial signup if required, and then use email/password with persistent sessions.

## What changes
- `?follow=1` no longer forces passwordless authentication.
- Follow onboarding defaults to **Sign up** for a new user, with an explicit **Already a member? Log in** option.
- New accounts use Supabase `signUp({ email, password })` with the existing display-name metadata and email-verification redirect.
- Returning accounts use the existing `signInWithPassword` backend path.
- Existing sessions continue to use Supabase `persistSession: true` + token refresh.
- Secondary Magic Link remains available only from sign-in mode and sets `shouldCreateUser: false`.
- Forgot Password remains available.
- `followTeam` survives browser and native auth redirects.
- Native email verification uses the existing `waterpolohq://auth/callback` bridge when running in Capacitor.

## Security / authority boundary
Creating a supporter account or following a team does not grant team membership, scoring, admin, roster, or raw event authority. Existing server-side follow and privacy/RLS controls remain the authority boundary.

## Deployment boundary
No database migration or Edge Function deployment is part of 7.64.33. Production Supabase Email/Confirm Email/redirect/password settings still need to match the intended behavior. CAPTCHA remains a separate pre-broad-rollout hardening item.

## Protected foundations
- 7.64.31 GroupMe delivery/finalization reliability is unchanged.
- 7.64.32 scorer draft isolation, Quick Time, Back/Cancel, duplicate protection and iPhone focus fixes are unchanged.
- Native auth callback scheme remains `waterpolohq://auth/callback`.

## Real-device acceptance test before push
- New email can Sign up from a team-follow route.
- Verification email arrives if Confirm Email is enabled.
- Verification returns to WPHQ / intended My Teams target.
- Existing account can use **Already a member? Log in** with email/password.
- Valid login persists through reload/app relaunch.
- Secondary one-time sign-in link works for an existing account and does not create an unknown email account.
- Forgot Password still sends a reset email.

## 7.64.33 account-entry correction
- The normal login page now always shows **Log in** and **Create account** as a two-option toggle.
- Creating an account does **not** grant team, scorer, admin, or club authority; existing invitation/onboarding authorization remains unchanged.

## Auth cache-bust correction
The validated public page must load `js/live-login-v7-64-33-1.js?v=7.64.33.1`. This prevents a stale pre-toggle 7.64.33 runtime from hiding Create account after the new HTML paints.
