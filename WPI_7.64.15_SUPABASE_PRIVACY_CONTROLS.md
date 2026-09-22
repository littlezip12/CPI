# Supabase privacy controls for WPI 7.64.15

## Required before broad parent rollout
- Authentication → Providers → Email: keep **Confirm email** enabled.
- Authentication → Security / Password Security: set minimum password length to **12** for staff/password accounts.
- Enable **Leaked password protection**.
- Keep Anonymous Sign-Ins enabled only because WPI guest scoring uses them; the 7.64.15 database migration blocks anonymous identities from parent/supporter private data.
- Authentication → URL Configuration: verify the WPI production Site URL and only required redirect URLs.

## CAPTCHA / Turnstile
- Create a Cloudflare Turnstile site.
- In Supabase Authentication CAPTCHA settings, enable Cloudflare Turnstile and enter the Turnstile secret key.
- Put only the public Turnstile **site key** into `config/live-sandbox.js` as `turnstileSiteKey`. Never put the Turnstile secret in the repository.

## Database/platform controls
- Database → Settings → SSL Configuration: enable **SSL Enforcement**.
- Database → Settings → Network Restrictions: restrict direct Postgres/pooler access to trusted IPs if your workflow supports it. This does not block normal browser Data API access.
- Review Database → Security Advisor after the migration. Some `authenticated SECURITY DEFINER` notices are expected for RPC-based WPI authorization; anonymous execution should be substantially reduced.

## WPI staff/admin accounts
- Open `live-account-security.html` and enroll an authenticator app for Owner/Admin/Scorer accounts. 7.64.15 provides enrollment; hard enforcement can be enabled after all privileged accounts have enrolled so nobody is accidentally locked out.
