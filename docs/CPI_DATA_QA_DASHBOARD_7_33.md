# CPI Data QA Dashboard Guide — 7.33

## Page

```text
rankings-qa.html
```

## What the dashboard is for

The dashboard is an internal review page for identifying data cleanup candidates before applying changes.

It is intentionally conservative. A flagged row is not automatically wrong.

## Issue types

### Same club / same age group

Flags clubs with multiple ranked teams in the same age/gender group.

Use this to confirm A/B/C, Red/Blue, Gold/Black, or second-team handling.

### Possible alias

Flags teams with similar normalized names within the same club and age group.

Use this to catch accidental duplicates.

### Quiksilver evidence

Flags teams that received Quiksilver evidence or latest-tournament metadata.

Use this to review whether the lightweight Quiksilver overlay looks reasonable.

### Review flag

Flags rows with ranking flags containing terms such as review, candidate, identity, alias, or provisional.

Use this before final post-JO cleanup.

### Missing logo

Flags rows without a logo path.

The current 7.33 snapshot reports zero missing logo paths, but official-logo quality may still need review.

### Missing region

Flags rows without a normalized region.

The current 7.33 snapshot reports zero missing region rows after the 7.25 cleanup.

## Recommended workflow

Use the dashboard to find issues, but record the actual decision in:

```text
data/qa/team-alias-fixes-template-7-31.csv
```

The later alias cleanup release should apply only approved decisions.
