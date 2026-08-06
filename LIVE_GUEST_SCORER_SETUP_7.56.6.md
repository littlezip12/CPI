# WPI 7.56.6 — Guest Scorer Handoff Setup

This release adds one active scorer per game, QR/code handoff, no-account guest scoring, Admin takeover, and scorer-control auditing.

## Required hosted changes

1. Install and push the 7.56.6 repository release.
2. In Supabase SQL Editor, run only:
   `supabase/migrations/202608050002_guest_scorer_handoff.sql`
3. In Supabase Dashboard, open **Authentication → Sign In / Providers** and enable **Allow anonymous sign-ins**.
4. Redeploy the existing function:

   ```bash
   cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
   npx supabase functions deploy groupme-post
   ```

Do not rerun either full setup SQL file. Do not recreate the GroupMe bot or reset its secret.

## Handoff behavior

- The active Scorer or an Owner/Admin taps **Transfer scoring**.
- WPI creates a five-minute, single-use QR pass and six-digit fallback code.
- The recipient scans or enters the code, types a display name, and accepts.
- No permanent WPI account, email, password, or app is required.
- The prior scorer becomes read-only only after acceptance.
- Admins may use **Take over scoring** at any time.
- All creation, acceptance, revocation, takeover, and game-end actions are audited.

## Security boundaries

- Raw pass tokens and fallback codes are never stored; only SHA-256 hashes are retained.
- A pass is limited to one game and expires after five minutes.
- Exactly one active scorer session may write a game.
- Guest scorers cannot manage the permanent roster, invitations, GroupMe configuration, secret mappings, other games, or platform data.
- Anonymous sessions use Supabase Auth and WPI Row Level Security; they are not public database access.
- The QR image is generated locally in the browser. WPI does not send the handoff URL to an external QR service.

## Pilot operational note

Anonymous Auth users are temporary identities. If the active guest scorer signs out or clears browser storage, an Admin or current scorer should generate a new pass. Before a broad public rollout, enable CAPTCHA/Turnstile and define cleanup for old anonymous Auth users.
