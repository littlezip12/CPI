# CPI Release 7.34.1 — Story Path Restore Hotfix

## Why this hotfix exists

The committed 7.34 repo contains `stories.html` and links pointing to `stories/quicksilver-cup-2026.html`, but the `stories/` directory itself was missing from the repo ZIP.

That causes story links to fail even though the archive page exists.

## Correct file placement

```text
CPI/
  stories.html
  stories/
    quicksilver-cup-2026.html
    pre-jo-rankings-context.html
    14u-girls-event-context.html
    club-footprint-notes.html
    12u-boys-team-depth-guardrails.html
```

## Files restored

- `stories/quicksilver-cup-2026.html`
- `stories/pre-jo-rankings-context.html`
- `stories/14u-girls-event-context.html`
- `stories/club-footprint-notes.html`
- `stories/12u-boys-team-depth-guardrails.html`

## No ranking/data changes

This hotfix does not change rankings, CPI scores, team order, aliases, regions, logos, layouts, or model logic.
