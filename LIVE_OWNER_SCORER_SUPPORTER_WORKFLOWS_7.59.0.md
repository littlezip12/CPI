# WPI Live 7.59.0 — Owner / Scorer / Supporter Workflows

## Owner / Admin
- Use **All Lamorinda Teams** for club status, readiness, people/access visibility and identity review.
- Open the specific team before changing roster, default starters, access, GroupMe, or creating a game. Team records remain isolated by stable `team_id`.
- Before a game, confirm Team + Season, matchup, roster/default starters, scorer assignment and GroupMe readiness.
- Manual opponents may be entered exactly as named. If WPI has no canonical match, keep the raw label and resolve it later through **Unlisted Opponents → Map to WPI…** only when the identity is known. Never guess.
- If a likely duplicate game is detected, use the existing canonical game unless there is a deliberate reason to override.
- Owner/Admin may perform emergency scorer takeover. Do not delete/recreate a game to recover scorer access.

## Scorer
- Open the assigned canonical game and confirm starters once.
- Score using the existing direct-action controls. One active scorer authority is enforced per game.
- Transfer scoring with the game-scoped handoff/claim workflow. The previous scorer becomes read-only.
- Final Whistle saves the canonical game and sends the complete GroupMe summary after final state is persisted.
- If a final was accidental and the recovery window permits it, use Reopen; do not create a replacement game. A later Final produces a new complete recap while prior delivery history remains audited.

## Supporter
- Permanent team membership and **Following** are different. Following is read-only and grants no roster, access, GroupMe or scoring authority.
- Selecting a followed team changes Live/Upcoming/Finals and Tournaments & Weekends together.
- Supporters can view followed-team recaps/archives. A Supporter can score only through a legitimate game-scoped scorer handoff.

## Multi-team safety
- Switching teams changes context only. It never moves/copies roster, games, access, GroupMe, stats or archive data.
- Each game, scorer session, roster version and local recovery state remains scoped to its canonical team/game identity.
