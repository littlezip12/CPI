# WPI Pre-ECC Production State — 2026-09-14

Operational production cleanup was completed directly in Supabase before this release. This file is a record only; it is intentionally **not** an executable migration because replaying a blanket game purge on a future environment would be unsafe.

Current intended production state:
- Active organization: Lamorinda only.
- Active team: Lamorinda A 14U Boys only.
- Acalanes High School, Campolindo High School, and Miramonte High School organizations and their teams are retained but inactive for future reactivation.
- Lamorinda 12U A, duplicate Lamorinda 14U Boys, and Lamorinda Team Insights Test are retained but inactive.
- All 19 historical test/friendly games and 10 test series present before ECC preparation were removed from production with their game-dependent records.

Do not convert this record into a destructive migration. Future season activation should be explicit and targeted.
