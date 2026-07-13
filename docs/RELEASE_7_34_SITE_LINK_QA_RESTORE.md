# CPI Release 7.34 — Site Link + QA Asset Restore

## Purpose

Release 7.34 is a readiness/hotfix release between the data QA work and the upcoming public-link cleanup.

It restores files that were referenced by the site but missing from the latest committed repo state, then adds a structured link/action audit so Release 7.35 can connect every public CTA to real pages and information.

## Changes

- Restored `stories/quicksilver-cup-2026.html`.
- Replaced the root `quicksilver-cup-2026.html` file with a safe redirect to the real story path.
- Restored prior QA CSV/JSON files used by the homepage, Stories page, and `rankings-qa.html`.
- Added a sitewide link/action audit:
  - `data/qa/site-link-audit-7-34.csv`
  - `data/qa/site-link-audit-7-34.json`
- Added a manual fix template:
  - `data/qa/site-link-fixes-template-7-34.csv`
- Added an internal QA page:
  - `site-qa.html`

## Audit Result

After restoration:

- 978 links/buttons/actions checked
- 977 OK or recognized as valid JS controls
- 1 public action still needs work

Open item:

- Homepage newsletter Subscribe button has no real action yet.

## Next Recommended Release

Release 7.35 should be the public link/CTA connection pass:

- Wire the homepage Subscribe CTA to a real destination/action.
- Replace public story-card CSV links with user-friendly article/QA summary pages.
- Review footer, story, tournament, methodology, and QA links.
- Keep raw CSV files available as supporting evidence, not as primary public story destinations.

## Not Changed

- Rankings
- CPI scores
- Team order
- Aliases
- Regions
- Logos
- Public ranking model
- Post-JO workflow
