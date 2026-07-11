# Release 7.13 — Pre-JO Older Age Rankings Expansion

Adds preliminary Pre-JO rankings for the remaining older groups: 16U Boys, 16U Girls, 18U Boys, and 18U Girls.

## Group summary

| Group | Games parsed | Ranked teams | Top 5 |
|---|---:|---:|---|
| 16U Boys | 745 | 78 | Imperial, Patriot, Mission, Trojan, Stanford A |
| 16U Girls | 269 | 33 | SBWPC A, Mission, South Coast, Meridian, Patriot |
| 18U Boys | 381 | 39 | Newport Beach, CC United, Mission, Imperial, North Irvine |
| 18U Girls | 261 | 34 | Newport Beach, SBWPC A, Regency, SoCal, Lamorinda A |

## Model guardrails

- Boys groups use Futures Super Finals as the primary major-event anchor, with JO Qualifiers as recent validation.
- Girls groups weight Futures Super Finals and US Club Championships as peer major events.
- D1/Platinum teams generally rank ahead of D2/Gold teams unless the D2 team has strong evidence against D1 teams.
- D2/Gold winners can move above lower D1 teams only with supporting wins/losses.
- D3/Silver teams are capped unless there is clear evidence against higher-tier teams.
- A/B/C team-depth logic and same-team alias cleanup are applied before publication.
- Review packets were added for each new group to support quick parent/coach validation.

## Files changed

- data.js
- rankings.json
- clubs.json
- club-registry.json
- platform.json
- VERSION.md
- data/pre-jo-16u-boys-7-13.json
- data/pre-jo-16u-girls-7-13.json
- data/pre-jo-18u-boys-7-13.json
- data/pre-jo-18u-girls-7-13.json
- docs/CPI_PRE_JO_OLDER_AGE_RANKING_REVIEW_7_13.md