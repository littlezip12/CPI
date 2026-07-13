# CPI Release 7.32 — Team Profile Polish + Evidence Clarity

## Purpose

Release 7.32 improves the team profile page now that the core club and rankings pages have been simplified. The goal is to make team profiles feel cleaner, more credible, and more consistent with the post-7.24 visual direction while preserving all ranking data.

## Changes

- Adds `css/team-profile-v7-32.css` for team profile polish overrides.
- Adds `js/team-profile-v7-32.js` for clearer team profile rendering.
- Updates `team.html` to use the 7.32 profile renderer and cache-busted assets.
- Removes heavy logo box treatment from team profile logos.
- Improves team hero sizing and snapshot hierarchy.
- Replaces the old future-modules panel with a data-notes panel.
- Adds latest-evidence and data-status language.
- Adds story links from team profiles when Quiksilver evidence is present.
- Keeps club, ranking, and peer context on the team page.

## No ranking changes

This release does not change:

- ranking order
- CPI scores
- movement values
- aliases
- team names
- club assignments
- regions
- logo assets
- model logic
- post-JO pipeline files

## Test URLs

- `/team.html?team=mission-a-12u-boys`
- `/team.html?team=vanguard-12u-boys`
- `/team.html?team=del-mar-12u-girls`
- `/team.html?team=ciu-gold-16u-boys`
- `/team.html?team=lb-viking-18u-girls`
- `/rankings.html?group=16u-boys`
