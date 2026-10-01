# Water Polo HQ 7.64.38 — Security Readiness

This release does **not** introduce a Supabase migration. It hardens consumer-side password reset and account-security presentation while preserving the existing RLS/auth/scorer foundation.

Before broad public signup volume, verify these Supabase Auth settings in the dashboard:

- Confirm Email remains enabled for permanent accounts.
- Minimum password length is at least 12 characters so server policy matches the Water Polo HQ signup/reset UI.
- Leaked Password Protection is enabled if the project plan exposes it.
- CAPTCHA/Turnstile is re-enabled with a valid frontend key before broad public signup volume.
- Redirect allowlist includes the production web origins and the native callback `waterpolohq://auth/callback`.
- Anonymous authentication remains enabled because guest scoring depends on it; do not disable it as a generic security cleanup.
- Existing Row Level Security/privacy guards remain enabled; this release intentionally does not widen data access.

No SQL needs to be copied into Supabase for 7.64.38.
