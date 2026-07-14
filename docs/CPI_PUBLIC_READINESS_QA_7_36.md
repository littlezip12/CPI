# CPI Public Readiness QA — 7.36

## QA goals

1. Public CTAs route to real pages.
2. Story cards route to readable pages, not raw CSV/JSON unless intentionally listed as supporting evidence.
3. Subscribe has a real destination page.
4. Navigation and footers expose the same core sections.
5. Internal QA pages remain accessible but do not block public browsing.

## Public pages to check

- `/`
- `/rankings.html`
- `/clubs.html`
- `/tournaments.html`
- `/stories.html`
- `/methodology.html`
- `/subscribe.html`
- `/stories/quicksilver-cup-2026.html`
- `/stories/quiksilver-alias-review.html`
- `/stories/quiksilver-ranking-audit.html`

## Known limitation

CPI is currently a static GitHub Pages site. The Subscribe page is wired as the public destination, but email capture still requires a provider such as Buttondown, Beehiiv, Mailchimp, Formspree, or a custom endpoint.
