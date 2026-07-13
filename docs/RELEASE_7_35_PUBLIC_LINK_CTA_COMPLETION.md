# CPI Release 7.35 — Public Link + CTA Completion

Status: targeted public-link cleanup

## Summary

Release 7.35 connects the most visible public calls-to-action to real pages or documented actions.

## Included changes

- Adds `subscribe.html` as the real destination for homepage newsletter/signup interest.
- Updates the homepage subscribe form from a no-op button to a GET form pointing to `subscribe.html`.
- Adds a no-JS fallback for the homepage rankings selector.
- Updates homepage and Stories archive story cards so public cards link to story/article pages instead of raw CSV files.
- Adds:
  - `stories/quiksilver-alias-review.html`
  - `stories/quiksilver-ranking-audit.html`
- Fixes the Universal Site Shell Stories nav item from `tournaments.html#stories` to `stories.html`.
- Replaces the root `quicksilver-cup-2026.html` with a clean redirect to `stories/quicksilver-cup-2026.html`.
- Adds a 7.35 link/action audit.

## No ranking changes

This release does not change rankings, CPI scores, team order, aliases, regions, logos, layouts, or model logic.

## Future newsletter integration

`subscribe.html` is now the public destination. To actually collect email addresses, connect the form to a newsletter backend such as Mailchimp, Buttondown, Beehiiv, Formspree, or another provider.
