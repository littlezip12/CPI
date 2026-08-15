# WPI Live 7.58.9 — Club Operations & Scale Polish

## Purpose
Scale the Lamorinda club pilot from two working teams toward a larger club workspace without changing scoring behavior.

## Adds
- Search/filter Club Team Status by team text, age, Boys/Girls/Coed, and Ready/Needs setup.
- Club-wide People & Access overview showing permanent memberships and separate read-only follows.
- Quick navigation from club cards/people rows into the specific team Access panel.
- Dedicated Unlisted Opponents identity-review queue with latest affected game link. Raw manual names remain preserved; WPI never auto-merges identity.
- Faster Add Team dialog with generated club + squad + age + group name and workspace-label preview; name remains editable.
- Pilot gate semantics: Offline → reconnect is Deferred / resilience, not a current pilot blocker. Official current-season tournament feed remains External dependency.

## Database
Migration `202608140001_club_operations_scale_polish.sql` adds a read-only `live_club_operations_v1` Owner/Admin RPC and replaces the pilot observability function with deferred-offline semantics. It does not broaden scoring, roster, membership, Following, GroupMe, game/event, or recap write authority.

## Preserved
- 7.58.8 Lamorinda club-branded scoring experience.
- 7.58.6 game-scoped storage, scorer handoff/recovery, Following isolation, archive/recap, manual opponent entry, and GroupMe protections.
- 7.58.5 official schedule no-guessing/reconciliation safety.
