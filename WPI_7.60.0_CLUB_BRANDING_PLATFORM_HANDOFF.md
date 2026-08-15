# WPI 7.60.0 — Club Branding Platform Handoff

## Baseline

Built from the authoritative pushed and validated **WPI 7.59.0 — Lamorinda Club Pilot Ready** baseline.

## Purpose

7.60.0 begins the post-pilot multi-club platform expansion. It converts the Lamorinda-only visual implementation into a canonical, data-driven club-branding layer while deliberately enabling only Lamorinda in production until additional club palettes are reviewed.

## Delivered

- Canonical theme candidate registry for all clubs in `data/identity/clubs.json`.
- Explicit activation config rather than automatic branding of every known club.
- Generic CSS-variable scoring shell using club primary/secondary/accent/logo data.
- Synchronous/offline-safe generated registry JS; no runtime fetch added.
- Longest-alias/canonical-ID identity resolution so related club names do not collide.
- Explicit regression proving Lamorinda Brentwood does not inherit Lamorinda styling.
- Validated Lamorinda navy/blue/gold presentation preserved.
- Neutral WPI fallback for all clubs not explicitly activated.

## Protected foundation

No change to scorer authority, game state, event writes, GroupMe delivery, roster extraction, local recovery, recaps, archives, handoffs, or the scoring-page layout.

## Roadmap after 7.60.0

- **7.60.1 — Self-Service Club Onboarding:** create club workspace, connect canonical WPI identity, add teams, Owner, branding, roster and GroupMe launch path.
- **7.60.2 — WPI Team Directory & Identity Management:** scalable aliases, unlisted opponent review, canonical mapping and team identity lifecycle.
- **7.60.3 — Public/Supporter Experience at Scale:** following across clubs, personalized game feed and scalable discovery/notifications foundation.

The first real 2026–2027 official tournament schedule remains an external integration validation dependency; do not fabricate it.
