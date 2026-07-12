# CPI Logo System — Release 7.21

## Canonical rule

Public-facing CPI data should use:

```text
assets/logos/canonical/<club-slug>.webp
```

This keeps homepage cards, rankings rows, team pages, club pages, and generated static club pages consistent.

## Source priority

1. Official/source logo already in the repo.
2. Existing normalized canonical logo from Release 7.16.
3. Polished CPI badge when no official source logo exists.

## Future replacements

When a real official logo is collected later, replace only the canonical file:

```text
assets/logos/canonical/<club-slug>.webp
```

Then update `data/logo-quality-audit-7-21.json` or create a new audit in the next release.

## Audit field

`officialSourceNeeded: true` means the current mark is a generated CPI badge rather than an official/source logo.
