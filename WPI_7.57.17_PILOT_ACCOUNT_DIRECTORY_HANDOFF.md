# WPI 7.57.17 — Pilot Account Directory & Access Operations Handoff

Built cumulatively from pushed WPI 7.57.16 baseline `CPI-main - 2026-08-09T213118.505.zip`.

## Scope
This release operationalizes the signup data captured in 7.57.16. The original Platform Owner gets an account-registry modal under Team Access with search, lifecycle fields, team memberships and CSV export. It does not add clutter to Supporter/Scorer experiences and does not broaden account-table RLS.

## Authorization
`live_is_platform_owner()` resolves the original earliest Owner membership created by the WPI Live bootstrap. `live_platform_account_registry_v1()` refuses every other authenticated account, including later team Owners.

## Protected foundation
Scoring, handoff, GroupMe, Final Whistle, summaries, roster vision, Game-Day queue, tournament reconciliation and the permanent tournament/weekend archive remain unchanged.

## Next product work
The active 2026–2027 WPI Tournament schedule index still has no published official games. Do not fabricate schedule data. Once a real schedule is published, use the next release to validate automatic Tournament → Game Day ingestion and manual-game reconciliation end-to-end. Until then, continue pilot UX/reliability hardening only where real usage reveals a need.
