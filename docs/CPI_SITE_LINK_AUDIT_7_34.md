# CPI Site Link Audit — 7.34

## Summary

Release 7.34 creates a sitewide audit of public links, internal file targets, and obvious button/action gaps.

## Files

- `data/qa/site-link-audit-7-34.csv`
- `data/qa/site-link-audit-7-34.json`
- `data/qa/site-link-fixes-template-7-34.csv`
- `site-qa.html`

## Current Results

| Metric | Count |
|---|---:|
| Links/buttons/actions checked | 978 |
| OK / recognized controls | 977 |
| Needs Fix | 1 |
| Review | 0 |

## Open Fix

### Homepage Subscribe

The homepage newsletter section currently renders an email input and Subscribe button, but the button has no real destination/action.

Recommended 7.35 options:

1. Create `subscribe.html` and route the form/button there.
2. Use a `mailto:` signup fallback until a real provider exists.
3. Hide the newsletter module until a real signup flow exists.

Preferred path: create a clean `subscribe.html` page that explains CPI updates and collects or directs subscriptions.

## Public CSV Links

A few public story cards still link directly to raw CSV files. These are valid file links, but not ideal public UX.

Recommended 7.35 fix:

- Create simple article/QA summary pages.
- Keep CSV links inside those pages as supporting evidence.
- Homepage/story cards should link to the summary page, not directly to the raw CSV.
