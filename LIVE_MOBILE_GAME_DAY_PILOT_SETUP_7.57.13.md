# WPI 7.57.13 — Mobile Game-Day Polish & Pilot Hardening

## Scope

This release is browser UX only. It does not change Supabase schema, Edge Functions, scorer-control RPCs, GroupMe delivery, roster vision, tournament reconciliation, or scoring persistence.

### Owner/Admin
- Game Day remains the single game-creation surface.
- Completed Guided Team Launch setup collapses into a compact ready state.
- On screens up to 900px, the long horizontal admin navigation is replaced by a compact **Team administration → Jump to…** control.
- When games are already on deck, the repeated Tournament/Friendly explanation is hidden so the queue stays primary.

### Supporter
The user-facing Supporter experience groups games into:
1. Live now
2. Upcoming
3. Recent finals

Supporters remain read-only and do not see Team Administration.

### Scorer
The focused Scorer experience groups games into:
1. Live now
2. Assigned to you
3. Available to claim

The active scorer-control/handoff model remains unchanged.

## Backend deployment

None.

- No SQL migration
- No Edge Function deploy
- No new secret
- Do not redeploy `groupme-post`
- Do not redeploy `roster-extract`
