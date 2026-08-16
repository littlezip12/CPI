# WPI 7.61.1 — High School Schedule → Game-Day Integration & Optional Delivery

## Baseline

Built cumulatively on the user's pushed/validated WPI 7.61.0 baseline `CPI-main - 2026-08-16T132211.051.zip`, including the high-school logo propagation and Platform Owner searchable Workspace-selector corrections.

## Product changes

1. Acalanes/Campolindo varsity schedules now feed Game Day as source-backed regular-season records.
2. Known-time schedule rows can auto-sync for Team Owners/Admins; TBA rows remain source-only.
3. Miramonte and all JV schedules remain deliberately unpublished.
4. Manual fallback stays available and duplicate reconciliation protects an already-created canonical game.
5. Score delivery is explicit per team: WPI Live only or WPI Live + GroupMe.
6. GroupMe is no longer a launch-readiness requirement when the team chooses WPI Live only.
7. Club-level launch readiness uses the same optional-delivery contract.

## Safety contracts

- WPI Live remains canonical regardless of external delivery mode.
- Following remains read-only and separate from membership/scorer authority.
- No source schedule can be synced to a different team family.
- No TBA time is invented.
- Existing scored games are not replaced by source sync.
- Existing GroupMe delivery history is not rewritten.
- Protected scoring engine, per-game browser recovery, GroupMe Edge Function and roster extraction Edge Function remain byte-stable.

## Database

Migration: `202608160003_high_school_schedule_optional_delivery.sql`.

No Edge Function deploy and no new secret.
