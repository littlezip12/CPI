# Water Polo HQ 7.64.40 — Public Beta Security Audit

**Audit point:** production Supabase project `jmdamtxspyshjxgmunda` (`WPI Live`, `us-west-1`)  
**Observed:** September 30 / October 1, 2026 during 7.64.40 preparation  
**Scope:** read-only security advisor + catalog inspection. **No production permissions were changed.**

## Current findings

### 1. Leaked password protection
Supabase Security Advisor reports **Leaked Password Protection Disabled**. Before broad public signup, enable Supabase Auth leaked-password protection if the current project plan exposes the control.

### 2. CAPTCHA / Turnstile
The WPHQ login runtime already supports Cloudflare Turnstile, but `config/live-sandbox.js` currently has a blank public `turnstileSiteKey`.

Before broad public signup:
- create/configure the Cloudflare Turnstile site,
- configure the Turnstile secret in Supabase Auth,
- place only the **public site key** in `config/live-sandbox.js`,
- validate signup, password reset, Magic Link, browser auth, and native auth callback.

Never store the Turnstile secret in GitHub or browser code.

### 3. SECURITY DEFINER RPC exposure
The live database currently has **77** `public` `SECURITY DEFINER` functions executable by the unauthenticated Postgres `anon` role.

A read-only catalog check found:
- **52** contain an obvious `auth.uid()` and/or `auth.jwt()` check in their function definition.
- **25** do not contain one of those obvious checks.

This does **not** mean all 77 are exploitable. The 25 include intentionally public read paths such as public scoreboards/tournament catalog functions, advertising selection/recording paths, registration-status logic, and trigger/helper functions. Other functions may gate access through helper functions rather than inline `auth.uid()` calls.

Because WPHQ intentionally uses:
- public score/tournament surfaces, and
- Supabase **anonymous Auth** sessions for guest scorers,

**7.64.40 applies no blanket permission migration.** Revoking `anon`/`public` from every flagged function without classification could break legitimate public or guest-scoring flows.

The next security-hardening release should classify each function as:
1. public unauthenticated RPC,
2. authenticated permanent/anonymous session RPC,
3. Owner/Admin/Platform Owner RPC,
4. trigger/internal helper not intended for direct RPC,

and then explicitly grant/revoke EXECUTE by category.

### 4. RLS enabled with no policy
Security Advisor reports four tables with RLS enabled and no policies:
- `public.live_account_registry`
- `public.live_ad_delivery_tokens`
- `public.live_game_scorer_passes`
- `public.live_subscription_products`

That can be an intentional **deny-all direct client access** posture for server-only tables. Confirm each table is accessed only through approved SECURITY DEFINER functions/Edge Functions before changing anything.

### 5. Anonymous-access advisor warnings
Supabase also reports anonymous-access policy warnings across live-scoring tables. WPHQ deliberately relies on Supabase anonymous Auth for temporary guest scorers, so disabling anonymous Auth is **not** an acceptable generic fix.

The correct hardening approach is to preserve temporary guest scorer functionality while ensuring every RLS policy and RPC checks the specific game/team/scorer authority it needs.

## Public-beta launch blockers

Before opening WPHQ signup broadly:
- [ ] Enable leaked-password protection where available.
- [ ] Configure Turnstile end-to-end and put only the public site key in the repo.
- [ ] Complete function-by-function EXECUTE privilege classification.
- [ ] Validate the four deny-all RLS tables are intentionally server-only.
- [ ] Re-run Supabase Security Advisor after privilege hardening.
- [ ] Regression-test guest scorer handoff, Final Whistle, GroupMe delivery, supporter follows, Team Insights, account deletion, MFA, password reset, and native auth.

## Release boundary

7.64.40 is an **audit and readiness** release. It makes **no Supabase migration, Auth-setting change, RLS change, Edge Function deployment, or EXECUTE grant/revoke change**.

That is intentional: public-beta security changes should be applied only after their affected workflows are explicitly classified and regression-tested.
