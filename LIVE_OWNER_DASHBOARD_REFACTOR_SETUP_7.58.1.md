# WPI Live 7.58.1 — Owner Dashboard Refactor

7.58.1 is a dashboard hierarchy/UX release over the validated 7.58.0 Club Workspace Foundation.

## Owner/Admin hierarchy

1. **Team Profile**
   - current team identity is visible first
   - existing team-scoped data remains tied to the stable `team_id`

2. **Team Readiness**
   - compact status surface instead of persistent onboarding
   - Profile, Roster, Scoring Access, and Score Updates remain independently checked
   - when a setup item is selected, WPI opens the collapsed Game Day Setup disclosure automatically when needed

3. **Game-Day Hub**
   - single routine operational queue
   - live/upcoming/ready/scorer-coverage behavior is preserved
   - official schedule/manual fallback reconciliation behavior is unchanged

4. **Game Day Setup**
   - collapsed by default
   - contains Roster, Team Access, and GroupMe setup
   - readiness status remains visible on the closed disclosure

5. **Tournaments & Weekends**
   - durable season archive remains unchanged

## Role isolation

Supporter and Scorer landing experiences remain compact and do not expose the moved Team Profile or Game Day Setup controls.

## Data / backend impact

None. No migration is included. The 7.58.0 club migration remains byte-identical, and the protected scoring, recovery, GroupMe, roster-extract, and backend files are unchanged.
