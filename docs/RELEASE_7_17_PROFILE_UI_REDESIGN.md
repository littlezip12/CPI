# Release 7.17 — Team and Club Profile UI Redesign

Release 7.17 is a targeted profile visual refinement release. It uses the polished team/club profile rendering as the north star while keeping the current CPI data and routing stable.

## Goals

- Make team profiles feel more premium and productized.
- Make club profiles feel more polished and connected to team navigation.
- Use the canonical logo system from Release 7.16.
- Preserve all rankings and CPI scores.
- Avoid major structural rewrites before Junior Olympics data is available.

## Team profile changes

- Adds a stronger dark branded profile experience.
- Refines the left rail club navigation.
- Improves current-rank hero treatment and KPI cards.
- Tightens profile tabs, team intelligence panels, same-age-group team cards, and statewide context panels.
- Keeps left rail navigation as the club-wide age/gender ladder.
- Keeps lower team section focused on same-club teams in the same age/gender group.

## Club profile changes

- Adds a more polished branded club hero.
- Improves logo treatment and hero hierarchy.
- Refines KPI cards, profile tabs, teams-by-age-group cards, and ranked portfolio rows.
- Improves rankings links so club/team CTAs open the relevant age/gender rankings when possible.

## Files changed

- `team.html`
- `club.html`
- `js/team-profile-v7-17.js`
- `js/club-intelligence-v7-17.js`
- `css/team-profile-v7-17.css`
- `css/club-intelligence-v7-17.css`
- `VERSION.md`

## Files intentionally not changed

- `data.js`
- `rankings.json`
- `clubs.json`
- ranking source files
- homepage ranking data
- ranking order
- CPI scores

## QA checklist

- `/team.html?team=mission-a-12u-boys`
- `/team.html?team=lamorinda-a-14u-girls`
- `/team.html?team=newport-beach-18u-boys`
- `/club.html?club=mission`
- `/club.html?club=lamorinda`
- `/club.html?club=newport-beach`
- `/rankings.html?group=12u-boys`
- `/rankings.html?group=14u-girls`

Confirm that logos load, profile colors still reflect clubs, header/footer remain stable, and mobile layouts stack cleanly.

## v3 targeted fix

- Keeps the v2 stylesheet-link fix.
- Adds backward-compatible team URL resolution so links like `team.html?team=vanguard-12u-boys` can resolve to legacy 12U Boys slugs such as `team.html?team=vanguard` when the group suffix is provided.
- Preserves existing canonical team URLs and ranking data.
