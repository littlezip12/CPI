# WPI 7.56.9 — Live UX Refresh

WPI 7.56.9 is a frontend UX release built on the authoritative 7.56.8 GroupMe Topic Delivery Foundation.

## Release focus

- Mobile-first Lamorinda blue/gold live scoring experience.
- Faster event entry with large quick-action controls while retaining every supported structured event.
- Moves **Time of play** later in the scoring workflow, after event/player context.
- Simplifies scorer handoff around QR-first transfer with a six-digit backup code/link.
- Simplifies GroupMe setup into Tournament GroupMe → Score Updates Topic → Test Connection → Save & use for new games.
- Moves technical GroupMe configuration behind **Advanced**.

## Protected 7.56.8 foundations

The release intentionally does **not** replace or migrate the existing connected backend. The 7.56.8 browser backend, GroupMe Edge Function, Topic migration, full Supabase setup SQL, and event registry are protected by byte-for-byte regression hashes in the 7.56.9 focused release check.

Protected behavior includes:

- GroupMe Topic delivery and Bot fallback.
- delivery persistence, retries, and audit trail.
- one active scorer per game.
- signed-in scorer code claim.
- Guest Scorer QR/code handoff.
- Admin takeover and previous-scorer read-only enforcement.
- structured event storage for analytics.
- OT, shootout, and Final Whistle sequencing.

## Supabase deployment

No new Supabase migration, secret, or Edge Function deployment is required for 7.56.9.

Run `./release-check-live-7.56.9` before the full `./release-check`.
