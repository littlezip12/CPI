# Release 7.6 — Club & Team Profile Navigation System

## Objective

Improve the connection between club profiles and team profiles without changing ranking data, homepage structure, or the rankings page foundation.

This release focuses on the navigation model parents and club users are likely to need:

- Team pages should expose the broader club structure.
- Team pages should also show the sibling teams in the same age/gender group.
- Club pages should organize ranked teams by age/gender group, not only as a flat list.

## Team page updates

- Adds a branded left rail on `team.html`.
- Left rail shows all ranked teams from the same club, grouped by age/gender.
- Current team is highlighted in the left rail.
- Adds a same-age/gender club section below the main intelligence cards.
- Same-group section shows the team’s direct sibling teams from the same club.
- Keeps statewide nearby-team context as a secondary module.
- Preserves dynamic club colors, logos, rank snapshot, and existing team URLs.

## Club profile updates

- Adds a “Teams by age group” section to `club.html`.
- Groups club teams by age/gender.
- Shows each group’s team count, best rank, and top CPI.
- Links directly into the relevant team page.
- Applies club-specific profile colors more visibly in the club hero.

## Files changed

- `team.html`
- `club.html`
- `clubs.html`
- `css/team-profile-v7-6.css`
- `js/team-profile-v7-6.js`
- `css/club-intelligence-v7-6.css`
- `js/club-intelligence-v7-6.js`

## Not changed

- Homepage structure
- Rankings page layout
- Rankings data
- Club registry data
- Tournament data
- Header/footer markup pattern

## QA checklist

- `index.html` still loads normally.
- `rankings.html` still loads normally.
- `clubs.html` still loads normally.
- `club.html?club=la-jolla-united` loads and shows teams grouped by age/gender.
- `team.html?team=la-jolla-united-a` loads and shows the left club navigation rail.
- `team.html?team=680-a` shows same-club teams in the same age/gender group.
- Team movement indicators still show large red/green arrows.
- Mobile layout stacks cleanly.
