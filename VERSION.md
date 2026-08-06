# WPI 7.56.6 — Guest Scorer Handoff & Scoped Admin Control

- Enforces exactly one active scoring controller per game.
- Allows the active Scorer or an Owner/Admin to generate a five-minute, single-use QR handoff pass with a six-digit fallback code.
- Lets a replacement scorer scan, enter a display name, and continue the same game without creating or signing into a permanent WPI account.
- Makes the prior scoring device read-only immediately after the replacement accepts.
- Gives Team Admins emergency takeover, permanent roster/game operations, GroupMe naming/testing, and delivery retry authority without exposing code, database access, credentials, or secret mappings.
- Stores only hashes of handoff tokens/codes and maintains a permanent assignment, transfer, takeover, and game-end audit trail.
- Preserves WPI 7.56.4 manual-game schema integrity and WPI 7.56.5 cross-account scorer persistence.
- Requires the new 7.56.6 Supabase migration, Anonymous Sign-Ins enabled in Supabase Authentication, and redeployment of `groupme-post`.
